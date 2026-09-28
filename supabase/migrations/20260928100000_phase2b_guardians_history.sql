-- Phase 2b: guardian invites, donation history, appreciation messages
-- (phase-2.md 2b, ARCHITECTURE §6/§8, OPEN_QUESTIONS Q20–Q21).

insert into public.app_settings (key, value, description) values
  ('max_patient_managers', '5', 'Maximum guardians/self managers per patient (product rule).'),
  ('guardian_invite_ttl_hours', '72', 'How long a guardian invite code stays valid.')
on conflict (key) do nothing;

-- === guardian_invites =========================================================
create table public.guardian_invites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles (user_id),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles (user_id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index guardian_invites_patient_idx on public.guardian_invites (patient_id);

alter table public.guardian_invites enable row level security;
revoke all on public.guardian_invites from public, anon, authenticated;
grant select on public.guardian_invites to authenticated;

create policy guardian_invites_select_managers on public.guardian_invites
  for select to authenticated
  using (public.is_patient_manager(patient_id) or public.is_admin());

create trigger audit_row_change
  after insert or update or delete on public.guardian_invites
  for each row execute function public.audit_row_change();

-- === appreciation_messages ====================================================
-- Manager → donor thank-you for one confirmed donation. The donor never sees
-- the sender's or patient's identity through this table (Q20); the sender may
-- write their own name in the text if they want to.
create table public.appreciation_messages (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null unique references public.donations (id),
  sender_id uuid not null references public.profiles (user_id),
  recipient_id uuid not null references public.profiles (user_id),
  message text not null check (char_length(message) between 1 and 300),
  hidden_by_recipient_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now()
);

create index appreciation_messages_recipient_idx on public.appreciation_messages (recipient_id);

alter table public.appreciation_messages enable row level security;
revoke all on public.appreciation_messages from public, anon, authenticated;
grant select on public.appreciation_messages to authenticated;

create policy appreciation_select_party on public.appreciation_messages
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

create trigger audit_row_change
  after insert or update or delete on public.appreciation_messages
  for each row execute function public.audit_row_change();

-- === deleted accounts can't regain roles ======================================
create function public.block_roles_for_deleted_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.profiles p where p.user_id = new.user_id and p.deleted_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'account_deleted';
  end if;
  return new;
end;
$$;

create trigger block_roles_for_deleted_profiles
  before insert on public.user_roles
  for each row execute function public.block_roles_for_deleted_profiles();

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid() and deleted_at is null);

-- === helpers ==================================================================
create function public.generate_guardian_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception using errcode = 'P0001', message = 'invite_code_generation_failed';
    end if;

    candidate := (
      select string_agg(substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1), '')
      from generate_series(1, 8)
    );

    exit when not exists (select 1 from public.guardian_invites where code = candidate)
      and not exists (select 1 from public.patients where invite_code = candidate);
  end loop;

  return candidate;
end;
$$;

-- Makes the longest-serving remaining manager primary if none is.
create function public.ensure_primary_manager(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.patient_managers where patient_id = p_patient_id and is_primary
  ) then
    update public.patient_managers
    set is_primary = true
    where (patient_id, user_id) = (
      select patient_id, user_id from public.patient_managers
      where patient_id = p_patient_id
      order by created_at, user_id
      limit 1
    );
  end if;
end;
$$;

-- === guardian RPCs ============================================================
create function public.create_guardian_invite(patient_id uuid)
returns public.guardian_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient public.patients;
  v_invite public.guardian_invites;
  v_max int;
begin
  if not public.is_patient_manager(patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_patient from public.patients where id = patient_id for update;
  if not found or v_patient.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'patient_not_found';
  end if;

  select (value #>> '{}')::int into v_max from public.app_settings where key = 'max_patient_managers';
  if (select count(*) from public.patient_managers pm where pm.patient_id = v_patient.id) >= coalesce(v_max, 5) then
    raise exception using errcode = 'P0001', message = 'manager_limit_reached';
  end if;

  insert into public.guardian_invites (patient_id, code, created_by, expires_at)
  values (
    v_patient.id,
    public.generate_guardian_invite_code(),
    auth.uid(),
    now() + make_interval(hours => coalesce(
      (select (value #>> '{}')::int from public.app_settings where key = 'guardian_invite_ttl_hours'), 72
    ))
  )
  returning * into v_invite;

  return v_invite;
end;
$$;

create function public.revoke_guardian_invite(invite_id uuid)
returns public.guardian_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.guardian_invites;
begin
  select * into v_invite from public.guardian_invites where id = invite_id for update;
  if not found or not public.is_patient_manager(v_invite.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_invite.accepted_at is not null or v_invite.revoked_at is not null then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.guardian_invites set revoked_at = now()
  where id = invite_id
  returning * into v_invite;

  return v_invite;
end;
$$;

-- Returns the patient id the caller now co-manages.
create function public.accept_guardian_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.guardian_invites;
  v_patient public.patients;
  v_max int;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid() and deleted_at is not null) then
    raise exception using errcode = 'P0001', message = 'account_deleted';
  end if;

  select * into v_invite
  from public.guardian_invites gi
  where gi.code = upper(trim(accept_guardian_invite.code))
  for update;

  if not found
     or v_invite.accepted_at is not null
     or v_invite.revoked_at is not null
     or v_invite.expires_at < now() then
    raise exception using errcode = 'P0001', message = 'invite_invalid';
  end if;

  select * into v_patient from public.patients where id = v_invite.patient_id for update;
  if v_patient.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'invite_invalid';
  end if;

  if public.is_patient_manager(v_patient.id) then
    raise exception using errcode = 'P0001', message = 'already_manager';
  end if;

  select (value #>> '{}')::int into v_max from public.app_settings where key = 'max_patient_managers';
  if (select count(*) from public.patient_managers pm where pm.patient_id = v_patient.id) >= coalesce(v_max, 5) then
    raise exception using errcode = 'P0001', message = 'manager_limit_reached';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (auth.uid(), 'guardian', auth.uid())
  on conflict (user_id, role) do nothing;

  insert into public.patient_managers (patient_id, user_id, relation, is_primary)
  values (v_patient.id, auth.uid(), 'guardian', false);

  update public.guardian_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invite.id;

  perform public.enqueue_notification(pm.user_id, 'guardian_added', 'patient', v_patient.id, '{}'::jsonb)
  from public.patient_managers pm
  where pm.patient_id = v_patient.id and pm.user_id <> auth.uid();

  return v_patient.id;
end;
$$;

-- Primary manager removes another guardian, or any manager leaves (target =
-- self). The patient's own 'self' account can only leave by itself, and the
-- last manager of an active patient can't leave (use account deletion).
create function public.remove_patient_manager(patient_id uuid, user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.patient_managers;
  v_caller public.patient_managers;
begin
  perform 1 from public.patients p where p.id = remove_patient_manager.patient_id for update;

  select * into v_caller from public.patient_managers pm
  where pm.patient_id = remove_patient_manager.patient_id and pm.user_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_target from public.patient_managers pm
  where pm.patient_id = remove_patient_manager.patient_id and pm.user_id = remove_patient_manager.user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'manager_not_found';
  end if;

  if v_target.user_id <> auth.uid() then
    if not v_caller.is_primary then
      raise exception using errcode = 'P0001', message = 'not_authorized';
    end if;
    if v_target.relation = 'self' then
      raise exception using errcode = 'P0001', message = 'cannot_remove_patient';
    end if;
  end if;

  if (select count(*) from public.patient_managers pm where pm.patient_id = remove_patient_manager.patient_id) <= 1 then
    raise exception using errcode = 'P0001', message = 'last_manager';
  end if;

  delete from public.patient_managers pm
  where pm.patient_id = remove_patient_manager.patient_id and pm.user_id = v_target.user_id;

  perform public.ensure_primary_manager(remove_patient_manager.patient_id);

  if v_target.user_id <> auth.uid() then
    perform public.enqueue_notification(v_target.user_id, 'guardian_removed', null, null, '{}'::jsonb);
  end if;
end;
$$;

-- Names of co-managers are only visible to other managers of the same patient.
create function public.get_patient_managers(patient_id uuid)
returns table (user_id uuid, display_name text, relation public.manager_relation, is_primary boolean, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_patient_manager(patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select pm.user_id, p.display_name, pm.relation, pm.is_primary, pm.user_id = auth.uid()
  from public.patient_managers pm
  join public.profiles p on p.user_id = pm.user_id
  where pm.patient_id = get_patient_managers.patient_id
  order by pm.is_primary desc, pm.created_at;
end;
$$;

-- === history ==================================================================
create function public.get_patient_donation_history(patient_id uuid)
returns table (
  donation_id uuid,
  request_id uuid,
  donated_on date,
  verification public.donation_verification,
  donor_display_name text,
  donor_deleted boolean,
  appreciation_sent boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_patient_manager(patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    d.id,
    d.request_id,
    d.donated_on,
    d.verification,
    case when p.deleted_at is null then p.display_name end,
    p.deleted_at is not null,
    exists (select 1 from public.appreciation_messages am where am.donation_id = d.id)
  from public.donations d
  join public.profiles p on p.user_id = d.donor_id
  where d.patient_id = get_patient_donation_history.patient_id
  order by d.donated_on desc, d.created_at desc;
end;
$$;

-- Patient name only while the donor is still connected (§9); thank-you text
-- unless the donor hid it or an admin removed it.
create function public.get_my_donation_history()
returns table (
  donation_id uuid,
  donated_on date,
  verification public.donation_verification,
  patient_display_name text,
  appreciation_id uuid,
  appreciation_message text,
  appreciation_created_at timestamptz
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
  select
    d.id,
    d.donated_on,
    d.verification,
    case when public.is_connected_donor(d.patient_id) then pt.display_name end,
    am.id,
    am.message,
    am.created_at
  from public.donations d
  join public.patients pt on pt.id = d.patient_id
  left join public.appreciation_messages am
    on am.donation_id = d.id
   and am.hidden_by_recipient_at is null
   and am.removed_at is null
  where d.donor_id = auth.uid()
  order by d.donated_on desc, d.created_at desc;
end;
$$;

-- === appreciation RPCs ========================================================
create function public.send_appreciation(donation_id uuid, message text)
returns public.appreciation_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_donation public.donations;
  v_message text := trim(send_appreciation.message);
  v_row public.appreciation_messages;
begin
  select * into v_donation from public.donations d where d.id = send_appreciation.donation_id;
  if not found or not public.is_patient_manager(v_donation.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_message is null or char_length(v_message) not between 1 and 300 then
    raise exception using errcode = 'P0001', message = 'invalid_message';
  end if;

  if exists (select 1 from public.profiles where user_id = v_donation.donor_id and deleted_at is not null) then
    raise exception using errcode = 'P0001', message = 'recipient_unavailable';
  end if;

  begin
    insert into public.appreciation_messages (donation_id, sender_id, recipient_id, message)
    values (v_donation.id, auth.uid(), v_donation.donor_id, v_message)
    returning * into v_row;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'appreciation_already_sent';
  end;

  perform public.enqueue_notification(
    v_donation.donor_id, 'appreciation_received', 'donation', v_donation.id, '{}'::jsonb
  );

  return v_row;
end;
$$;

create function public.hide_appreciation(appreciation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.appreciation_messages
  set hidden_by_recipient_at = coalesce(hidden_by_recipient_at, now())
  where id = appreciation_id and recipient_id = auth.uid();

  if not found then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;
end;
$$;

create function public.remove_appreciation(appreciation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  update public.appreciation_messages
  set removed_at = coalesce(removed_at, now()), removed_by = coalesce(removed_by, auth.uid())
  where id = appreciation_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
end;
$$;

grant execute on function public.create_guardian_invite to authenticated;
grant execute on function public.revoke_guardian_invite to authenticated;
grant execute on function public.accept_guardian_invite to authenticated;
grant execute on function public.remove_patient_manager to authenticated;
grant execute on function public.get_patient_managers to authenticated;
grant execute on function public.get_patient_donation_history to authenticated;
grant execute on function public.get_my_donation_history to authenticated;
grant execute on function public.send_appreciation to authenticated;
grant execute on function public.hide_appreciation to authenticated;
grant execute on function public.remove_appreciation to authenticated;
