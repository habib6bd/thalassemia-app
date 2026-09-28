-- Phase 2d: verified organization directory + admin basics
-- (phase-2.md 2d, ARCHITECTURE §6/§7.5/§8, OPEN_QUESTIONS Q14, Q28–Q31).
--
-- No organization is seeded (CLAUDE.md #10). Admins add entries after
-- checking them (phone call / official website, Q14); only `verified`
-- entries are shown to users, with their "last verified" date. A daily
-- pg_cron job reminds admins before an entry is due and marks it `stale`
-- (hidden again) once `organization_reverify_months` have passed.

create type public.organization_type as enum (
  'treatment_centre',
  'hospital',
  'blood_bank',
  'diagnostic_centre',
  'genetic_counselling',
  'support_org'
);

-- pending → verified ⇄ stale; any → rejected (never shown); rejected → pending (re-check).
create type public.organization_verification_status as enum ('pending', 'verified', 'stale', 'rejected');

create type public.organization_verification_method as enum (
  'phone_call',
  'official_website',
  'in_person',
  'official_document'
);

insert into public.app_settings (key, value, description) values
  ('organization_reverify_months', '12', 'Months after which a verified organization is marked stale and hidden until re-verified (OPEN_QUESTIONS Q14).'),
  ('organization_reverify_reminder_days', '30', 'Days before an organization becomes stale that admins get a re-verification reminder.')
on conflict (key) do nothing;

-- === organizations ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  name_bn text check (name_bn is null or char_length(name_bn) between 1 and 200),
  type public.organization_type not null,
  address text check (address is null or char_length(address) <= 300),
  district_id int not null references public.districts (id),
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  website text check (website is null or (website ~* '^https?://[^\s]+$' and char_length(website) <= 300)),
  services text check (services is null or char_length(services) <= 1000),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 300),
  verification_status public.organization_verification_status not null default 'pending',
  last_verified_at timestamptz,
  verified_by uuid references public.profiles (user_id),
  verification_method public.organization_verification_method,
  verification_note text check (verification_note is null or char_length(verification_note) <= 500),
  reverify_reminded_at timestamptz,
  created_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  -- A verified entry always records who verified it, how and when.
  check (
    verification_status <> 'verified'
    or (last_verified_at is not null and verified_by is not null and verification_method is not null)
  )
);

create index organizations_directory_idx on public.organizations (verification_status, district_id, type);

create table public.organization_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status public.organization_verification_status not null,
  method public.organization_verification_method,
  note text check (note is null or char_length(note) <= 500),
  verified_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now()
);

create index organization_verifications_org_idx on public.organization_verifications (organization_id, created_at desc);

create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger audit_row_change after insert or update or delete on public.organizations
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.organization_verifications
  for each row execute function public.audit_row_change();
-- Setting changes are important actions too (CLAUDE.md #11).
create trigger audit_row_change after insert or update or delete on public.app_settings
  for each row execute function public.audit_row_change();

alter table public.organizations enable row level security;
alter table public.organization_verifications enable row level security;
revoke all on public.organizations, public.organization_verifications from public, anon, authenticated;

-- Users read the directory columns only; verification internals (who, note,
-- reminder) are for admins through admin_list_organizations().
grant select (
  id, name, name_bn, type, address, district_id, latitude, longitude, phone, website,
  services, opening_hours, verification_status, last_verified_at, created_at, updated_at
) on public.organizations to authenticated;
grant select on public.organization_verifications to authenticated;

create policy organizations_select_verified on public.organizations
  for select to authenticated
  using (verification_status = 'verified' or public.is_admin());

create policy organization_verifications_select_admin on public.organization_verifications
  for select to authenticated
  using (public.is_admin());

-- === links from patients and requests =========================================
alter table public.patients
  add column treating_organization_id uuid references public.organizations (id);
alter table public.blood_requests
  add column organization_id uuid references public.organizations (id);

-- New requests inherit the patient's verified centre (free text stays as the fallback).
create function public.default_request_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is null then
    select p.treating_organization_id into new.organization_id
    from public.patients p
    join public.organizations o on o.id = p.treating_organization_id
    where p.id = new.patient_id and o.verification_status = 'verified';
  end if;
  return new;
end;
$$;

create trigger default_request_organization
  before insert on public.blood_requests
  for each row execute function public.default_request_organization();

create function public.assert_verified_organization(p_organization_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_organization_id is not null and not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.verification_status = 'verified'
  ) then
    raise exception using errcode = 'P0001', message = 'organization_not_verified';
  end if;
end;
$$;

-- organization_id null clears the link. Only verified entries can be linked.
create function public.set_patient_organization(patient_id uuid, organization_id uuid)
returns public.patients
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient public.patients;
begin
  if not public.is_patient_manager(set_patient_organization.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  perform public.assert_verified_organization(set_patient_organization.organization_id);

  update public.patients p
  set treating_organization_id = set_patient_organization.organization_id
  where p.id = set_patient_organization.patient_id and p.archived_at is null
  returning * into v_patient;

  if not found then
    raise exception using errcode = 'P0001', message = 'patient_not_found';
  end if;

  return v_patient;
end;
$$;

create function public.set_request_organization(request_id uuid, organization_id uuid)
returns public.blood_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.blood_requests;
begin
  select * into v_request from public.blood_requests br
  where br.id = set_request_organization.request_id
  for update;

  if not found or not public.is_patient_manager(v_request.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_request.status in ('fulfilled', 'cancelled', 'expired') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  perform public.assert_verified_organization(set_request_organization.organization_id);

  update public.blood_requests br
  set organization_id = set_request_organization.organization_id
  where br.id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

-- === admin: organizations =====================================================
create function public.admin_list_organizations()
returns setof public.organizations
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select * from public.organizations o
  order by
    case o.verification_status when 'pending' then 0 when 'stale' then 1 when 'verified' then 2 else 3 end,
    o.name;
end;
$$;

-- Creates (organization_id null) or edits an entry. Details only; verification
-- is a separate, recorded step (admin_set_organization_verification).
create function public.admin_upsert_organization(
  organization_id uuid,
  name text,
  type public.organization_type,
  district_id int,
  name_bn text default null,
  address text default null,
  latitude numeric default null,
  longitude numeric default null,
  phone text default null,
  website text default null,
  services text default null,
  opening_hours text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.organizations;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  begin
    if admin_upsert_organization.organization_id is null then
      insert into public.organizations (
        name, name_bn, type, address, district_id, latitude, longitude, phone, website,
        services, opening_hours, created_by
      ) values (
        trim(admin_upsert_organization.name), nullif(trim(admin_upsert_organization.name_bn), ''),
        admin_upsert_organization.type, nullif(trim(admin_upsert_organization.address), ''),
        admin_upsert_organization.district_id, admin_upsert_organization.latitude,
        admin_upsert_organization.longitude, nullif(trim(admin_upsert_organization.phone), ''),
        nullif(trim(admin_upsert_organization.website), ''),
        nullif(trim(admin_upsert_organization.services), ''),
        nullif(trim(admin_upsert_organization.opening_hours), ''), auth.uid()
      )
      returning * into v_row;
    else
      update public.organizations o set
        name = trim(admin_upsert_organization.name),
        name_bn = nullif(trim(admin_upsert_organization.name_bn), ''),
        type = admin_upsert_organization.type,
        address = nullif(trim(admin_upsert_organization.address), ''),
        district_id = admin_upsert_organization.district_id,
        latitude = admin_upsert_organization.latitude,
        longitude = admin_upsert_organization.longitude,
        phone = nullif(trim(admin_upsert_organization.phone), ''),
        website = nullif(trim(admin_upsert_organization.website), ''),
        services = nullif(trim(admin_upsert_organization.services), ''),
        opening_hours = nullif(trim(admin_upsert_organization.opening_hours), '')
      where o.id = admin_upsert_organization.organization_id
      returning * into v_row;

      if not found then
        raise exception using errcode = 'P0001', message = 'not_found';
      end if;
    end if;
  exception
    when check_violation or foreign_key_violation or not_null_violation or numeric_value_out_of_range then
      raise exception using errcode = 'P0001', message = 'invalid_organization';
  end;

  return v_row;
end;
$$;

-- status: 'verified' needs a method; 'rejected'/'pending' record a note.
-- Every call appends to organization_verifications (the verification history).
create function public.admin_set_organization_verification(
  organization_id uuid,
  status public.organization_verification_status,
  method public.organization_verification_method default null,
  note text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.organizations;
  v_note text := nullif(trim(admin_set_organization_verification.note), '');
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if admin_set_organization_verification.status = 'stale' then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if admin_set_organization_verification.status = 'verified' and admin_set_organization_verification.method is null then
    raise exception using errcode = 'P0001', message = 'verification_method_required';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_organization';
  end if;

  select * into v_row from public.organizations o
  where o.id = admin_set_organization_verification.organization_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  if admin_set_organization_verification.status = 'verified' then
    update public.organizations o set
      verification_status = 'verified',
      last_verified_at = now(),
      verified_by = auth.uid(),
      verification_method = admin_set_organization_verification.method,
      verification_note = v_note,
      reverify_reminded_at = null
    where o.id = v_row.id
    returning * into v_row;
  else
    update public.organizations o set
      verification_status = admin_set_organization_verification.status,
      verification_note = v_note
    where o.id = v_row.id
    returning * into v_row;

    -- Links to an entry that is no longer shown are dropped from open work.
    update public.patients set treating_organization_id = null
    where treating_organization_id = v_row.id and admin_set_organization_verification.status = 'rejected';
  end if;

  insert into public.organization_verifications (organization_id, status, method, note, verified_by)
  values (v_row.id, admin_set_organization_verification.status, admin_set_organization_verification.method, v_note, auth.uid());

  return v_row;
end;
$$;

-- === re-verification job ======================================================
-- Internal only (not granted); run daily by pg_cron.
create function public.process_organization_reverification()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_months int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'organization_reverify_months'), 12);
  v_days int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'organization_reverify_reminder_days'), 30);
  v_org public.organizations;
begin
  -- 1. Reminder once, v_days before the entry goes stale.
  for v_org in
    select * from public.organizations
    where verification_status = 'verified'
      and reverify_reminded_at is null
      and last_verified_at < now() - make_interval(months => v_months) + make_interval(days => v_days)
    for update skip locked
  loop
    update public.organizations set reverify_reminded_at = now() where id = v_org.id;
    perform public.enqueue_notification(
      ur.user_id, 'organization_reverification_due', 'organization', v_org.id, '{}'::jsonb
    )
    from public.user_roles ur where ur.role = 'admin';
  end loop;

  -- 2. Past the window: stale (hidden from users until re-verified).
  for v_org in
    select * from public.organizations
    where verification_status = 'verified'
      and last_verified_at < now() - make_interval(months => v_months)
    for update skip locked
  loop
    update public.organizations set verification_status = 'stale' where id = v_org.id;
    insert into public.organization_verifications (organization_id, status, note)
    values (v_org.id, 'stale', 'automatic: re-verification overdue');
    perform public.enqueue_notification(
      ur.user_id, 'organization_marked_stale', 'organization', v_org.id, '{}'::jsonb
    )
    from public.user_roles ur where ur.role = 'admin';
  end loop;
end;
$$;

select cron.schedule(
  'process-organization-reverification',
  '17 3 * * *',
  $$select public.process_organization_reverification()$$
);

-- === admin: users & roles =====================================================
create function public.admin_search_users(query text default null, max_rows int default 50)
returns table (
  user_id uuid,
  display_name text,
  email text,
  roles public.app_role[],
  created_at timestamptz,
  deleted boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := nullif(trim(admin_search_users.query), '');
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    p.user_id,
    p.display_name,
    u.email::text,
    coalesce(
      (select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = p.user_id),
      '{}'::public.app_role[]
    ),
    p.created_at,
    p.deleted_at is not null
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where v_query is null
     or p.display_name ilike '%' || v_query || '%'
     or u.email ilike '%' || v_query || '%'
  order by p.created_at desc
  limit least(greatest(coalesce(admin_search_users.max_rows, 50), 1), 200);
end;
$$;

-- Only the roles that can't be self-assigned (organization, admin) are managed here.
create function public.admin_set_user_role(user_id uuid, role public.app_role, granted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if admin_set_user_role.role not in ('organization', 'admin') then
    raise exception using errcode = 'P0001', message = 'role_not_admin_managed';
  end if;

  if not exists (select 1 from public.profiles p where p.user_id = admin_set_user_role.user_id) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  if granted then
    insert into public.user_roles (user_id, role, granted_by)
    values (admin_set_user_role.user_id, admin_set_user_role.role, auth.uid())
    on conflict do nothing;
  else
    if admin_set_user_role.role = 'admin' and admin_set_user_role.user_id = auth.uid() then
      raise exception using errcode = 'P0001', message = 'cannot_remove_own_admin';
    end if;
    delete from public.user_roles r
    where r.user_id = admin_set_user_role.user_id and r.role = admin_set_user_role.role;
  end if;
end;
$$;

-- === admin: requests overview (aggregates only, no personal data) =============
create function public.admin_request_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return jsonb_build_object(
    'by_status', coalesce((
      select jsonb_object_agg(s.status, s.n) from (
        select br.status, count(*) as n from public.blood_requests br group by br.status
      ) s
    ), '{}'::jsonb),
    'open_emergencies', (
      select count(*) from public.blood_requests br
      where br.is_emergency and br.status in ('open', 'responding', 'partially_fulfilled')
    ),
    'created_last_7_days', (select count(*) from public.blood_requests br where br.created_at > now() - interval '7 days'),
    'created_last_30_days', (select count(*) from public.blood_requests br where br.created_at > now() - interval '30 days'),
    'fulfilled_last_30_days', (
      select count(*) from public.blood_requests br
      where br.status = 'fulfilled' and br.closed_at > now() - interval '30 days'
    ),
    'donations_last_30_days', (select count(*) from public.donations d where d.created_at > now() - interval '30 days'),
    'open_reports', (select count(*) from public.reports r where r.status = 'open'),
    'organizations_pending', (
      select count(*) from public.organizations o where o.verification_status in ('pending', 'stale')
    )
  );
end;
$$;

-- === admin: app_settings ======================================================
-- Existing keys only; the new value must be a whole number from 1 to 10000
-- (every setting today is a count, hours, days or months).
create function public.admin_update_setting(key text, value jsonb)
returns public.app_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.app_settings;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_row from public.app_settings s where s.key = admin_update_setting.key for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  if jsonb_typeof(admin_update_setting.value) <> 'number'
     or (admin_update_setting.value #>> '{}')::numeric <> trunc((admin_update_setting.value #>> '{}')::numeric)
     or (admin_update_setting.value #>> '{}')::numeric not between 1 and 10000 then
    raise exception using errcode = 'P0001', message = 'invalid_setting_value';
  end if;

  update public.app_settings s
  set value = admin_update_setting.value, updated_by = auth.uid()
  where s.key = admin_update_setting.key
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_patient_organization to authenticated;
grant execute on function public.set_request_organization to authenticated;
grant execute on function public.admin_list_organizations to authenticated;
grant execute on function public.admin_upsert_organization to authenticated;
grant execute on function public.admin_set_organization_verification to authenticated;
grant execute on function public.admin_search_users to authenticated;
grant execute on function public.admin_set_user_role to authenticated;
grant execute on function public.admin_request_overview to authenticated;
grant execute on function public.admin_update_setting to authenticated;
