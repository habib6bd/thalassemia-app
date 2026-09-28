-- Phase 4b: organization portal (phase-3-4.md 4b, ARCHITECTURE §6/§7.3/§8,
-- OPEN_QUESTIONS Q7, Q39–Q41).
--
-- Admins add staff to a (verified) organization. Staff see the blood
-- requests linked to their organization and can confirm a donation that
-- happened there; that donation is recorded as `org_verified`. Staff never
-- see thalassemia type, notes, phone numbers or anything outside requests
-- linked to their organization.

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  added_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

alter table public.organization_members enable row level security;
revoke all on public.organization_members from public, anon, authenticated;
grant select on public.organization_members to authenticated;

create policy organization_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create trigger audit_row_change after insert or update or delete on public.organization_members
  for each row execute function public.audit_row_change();

-- Member of a *verified* organization (the only kind that may act).
create function public.is_active_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and o.verification_status = 'verified'
      and public.has_role('organization')
  );
$$;

-- Removing staff data when an account is deleted (Q21).
create function public.organization_cleanup_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.organization_members where user_id = new.user_id;
  return new;
end;
$$;

create trigger organization_cleanup_on_profile_delete
  after update of deleted_at on public.profiles
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.organization_cleanup_on_profile_delete();

-- === admin: members ===========================================================
-- Adding grants the `organization` role; removing the last membership takes it away.
create function public.admin_set_organization_member(organization_id uuid, user_id uuid, member boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if not exists (select 1 from public.organizations o where o.id = admin_set_organization_member.organization_id) then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  if member then
    if not exists (
      select 1 from public.profiles p
      where p.user_id = admin_set_organization_member.user_id and p.deleted_at is null
    ) then
      raise exception using errcode = 'P0001', message = 'not_found';
    end if;

    insert into public.user_roles (user_id, role, granted_by)
    values (admin_set_organization_member.user_id, 'organization', auth.uid())
    on conflict do nothing;

    insert into public.organization_members (organization_id, user_id, added_by)
    values (admin_set_organization_member.organization_id, admin_set_organization_member.user_id, auth.uid())
    on conflict do nothing;

    if found then
      perform public.enqueue_notification(
        admin_set_organization_member.user_id, 'organization_member_added', 'organization_membership',
        admin_set_organization_member.organization_id, '{}'::jsonb
      );
    end if;
  else
    delete from public.organization_members m
    where m.organization_id = admin_set_organization_member.organization_id
      and m.user_id = admin_set_organization_member.user_id;

    if not exists (select 1 from public.organization_members m where m.user_id = admin_set_organization_member.user_id) then
      delete from public.user_roles r
      where r.user_id = admin_set_organization_member.user_id and r.role = 'organization';
    end if;
  end if;
end;
$$;

create function public.admin_list_organization_members(organization_id uuid)
returns table (user_id uuid, display_name text, email text, created_at timestamptz)
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
  select m.user_id, p.display_name, u.email::text, m.created_at
  from public.organization_members m
  join public.profiles p on p.user_id = m.user_id
  join auth.users u on u.id = m.user_id
  where m.organization_id = admin_list_organization_members.organization_id
  order by m.created_at;
end;
$$;

-- === staff: portal ============================================================
create function public.org_my_organizations()
returns table (
  id uuid,
  name text,
  name_bn text,
  type public.organization_type,
  verification_status public.organization_verification_status,
  can_act boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select o.id, o.name, o.name_bn, o.type, o.verification_status, public.is_active_organization_member(o.id)
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
  order by o.name;
end;
$$;

-- Requests linked to the organization that are open, or closed in the last
-- 30 days. Minimal fields (Q39): no thalassemia type, notes or contacts.
create function public.org_list_requests(organization_id uuid)
returns table (
  id uuid,
  patient_display_name text,
  blood_group public.blood_group,
  units_needed smallint,
  required_at timestamptz,
  status public.request_status,
  is_emergency boolean,
  accepted_count int,
  completed_count int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_organization_member(org_list_requests.organization_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    br.id,
    case when pt.archived_at is null then pt.display_name end,
    br.blood_group,
    br.units_needed,
    br.required_at,
    br.status,
    br.is_emergency,
    (select count(*)::int from public.donor_responses dr
     where dr.request_id = br.id and dr.status in ('accepted', 'donation_pending')),
    (select count(*)::int from public.donor_responses dr
     where dr.request_id = br.id and dr.status = 'completed')
  from public.blood_requests br
  join public.patients pt on pt.id = br.patient_id
  where br.organization_id = org_list_requests.organization_id
    and (
      br.status in ('open', 'responding', 'partially_fulfilled')
      or (br.status = 'fulfilled' and br.closed_at > now() - interval '30 days')
    )
  order by br.required_at;
end;
$$;

-- Donors who said they can donate (or already did) for one linked request.
create function public.org_list_request_responses(request_id uuid)
returns table (
  response_id uuid,
  donor_display_name text,
  status public.response_status,
  scheduled_at timestamptz,
  donor_reported_donated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select br.organization_id into v_org from public.blood_requests br where br.id = org_list_request_responses.request_id;
  if v_org is null or not public.is_active_organization_member(v_org) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select dr.id,
    case when p.deleted_at is null then p.display_name end,
    dr.status, dr.scheduled_at, dr.donor_reported_donated_at
  from public.donor_responses dr
  join public.profiles p on p.user_id = dr.donor_id
  where dr.request_id = org_list_request_responses.request_id
    and dr.status in ('accepted', 'donation_pending', 'completed')
  order by dr.status, dr.scheduled_at nulls last;
end;
$$;

-- Staff of the request's verified organization confirm a donation that
-- happened there (§7.3, Q7). Same transition as confirm_donation(), but the
-- donation is recorded as org_verified and the patient's managers are told.
create function public.org_confirm_donation(response_id uuid, donated_on date)
returns public.donations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response public.donor_responses;
  v_request public.blood_requests;
  v_donation public.donations;
begin
  select * into v_response from public.donor_responses dr
  where dr.id = org_confirm_donation.response_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  select * into v_request from public.blood_requests br where br.id = v_response.request_id for update;

  if v_request.organization_id is null or not public.is_active_organization_member(v_request.organization_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_response.status not in ('accepted', 'donation_pending') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if org_confirm_donation.donated_on is null
     or org_confirm_donation.donated_on > public.bd_date(now())
     or org_confirm_donation.donated_on < public.bd_date(v_request.created_at) then
    raise exception using errcode = 'P0001', message = 'invalid_donation_date';
  end if;

  insert into public.donations (response_id, request_id, patient_id, donor_id, donated_on, verification, confirmed_by)
  values (v_response.id, v_request.id, v_request.patient_id, v_response.donor_id,
          org_confirm_donation.donated_on, 'org_verified', auth.uid())
  returning * into v_donation;

  update public.donor_responses
  set status = 'completed', status_changed_at = now(), status_changed_by = auth.uid()
  where id = v_response.id;

  perform public.enqueue_notification(
    v_response.donor_id, 'donation_confirmed', 'blood_request', v_request.id, '{}'::jsonb
  );
  perform public.enqueue_notification(
    pm.user_id, 'donation_confirmed', 'blood_request', v_request.id, jsonb_build_object('by_organization', true)
  )
  from public.patient_managers pm
  where pm.patient_id = v_request.patient_id;

  perform public.recompute_request_status(v_request.id);

  return v_donation;
end;
$$;

grant execute on function public.is_active_organization_member to authenticated;
grant execute on function public.admin_set_organization_member to authenticated;
grant execute on function public.admin_list_organization_members to authenticated;
grant execute on function public.org_my_organizations to authenticated;
grant execute on function public.org_list_requests to authenticated;
grant execute on function public.org_list_request_responses to authenticated;
grant execute on function public.org_confirm_donation to authenticated;
