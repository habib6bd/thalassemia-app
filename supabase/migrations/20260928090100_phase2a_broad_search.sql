-- Phase 2a: broad donor search, broad invites and patient-side connection
-- requests (ARCHITECTURE §7.1, §9; OPEN_QUESTIONS Q19).

-- Manager-only. Returns opted-in donors (never contact data, §9), newest
-- activity first, at most 50.
create function public.search_broad_donors(request_id uuid, include_division boolean default false)
returns table (
  donor_id uuid,
  display_name text,
  area text,
  district_id int,
  activity text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_request public.blood_requests;
begin
  select * into v_request from public.blood_requests br where br.id = search_broad_donors.request_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if not public.is_patient_manager(v_request.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_request.status not in ('open', 'responding', 'partially_fulfilled') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if v_request.current_tier <> 'broad' then
    raise exception using errcode = 'P0001', message = 'search_not_available_yet';
  end if;

  return query
  select
    dp.user_id,
    pr.display_name,
    pr.area,
    pr.district_id,
    case
      when a.last_active >= now() - interval '7 days' then 'week'
      when a.last_active >= now() - interval '30 days' then 'month'
      else 'older'
    end
  from public.donor_profiles dp
  join public.profiles pr on pr.user_id = dp.user_id
  cross join lateral (
    select greatest(
      dp.updated_at,
      (select max(dr.responded_at) from public.donor_responses dr where dr.donor_id = dp.user_id)
    ) as last_active
  ) a
  where dp.searchable
    and dp.blood_group = v_request.blood_group
    and dp.availability = 'available'
    and dp.user_id <> auth.uid()
    and public.is_broad_eligible_donor(v_request, dp.user_id, false, search_broad_donors.include_division)
    and not exists (
      select 1 from public.donor_responses dr
      where dr.request_id = v_request.id and dr.donor_id = dp.user_id
    )
  order by a.last_active desc
  limit 50;
end;
$$;

-- Manager-only. Re-checks everything search checked (division-wide), since
-- the donor id comes from the client.
create function public.invite_broad_donor(request_id uuid, donor_id uuid)
returns public.donor_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.blood_requests;
  v_limit int;
  v_response public.donor_responses;
begin
  select * into v_request from public.blood_requests br where br.id = invite_broad_donor.request_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if not public.is_patient_manager(v_request.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_request.status not in ('open', 'responding', 'partially_fulfilled') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if v_request.current_tier <> 'broad' then
    raise exception using errcode = 'P0001', message = 'search_not_available_yet';
  end if;

  if exists (
    select 1 from public.donor_responses dr
    where dr.request_id = v_request.id and dr.donor_id = invite_broad_donor.donor_id
  ) then
    raise exception using errcode = 'P0001', message = 'already_invited';
  end if;

  if invite_broad_donor.donor_id = auth.uid()
     or not public.is_broad_eligible_donor(v_request, invite_broad_donor.donor_id, false, true) then
    raise exception using errcode = 'P0001', message = 'donor_not_available';
  end if;

  select coalesce((value #>> '{}')::int, 20) into v_limit
  from public.app_settings where key = 'broad_invite_limit';

  if (
    select count(*) from public.donor_responses dr
    where dr.request_id = v_request.id and dr.invited_via = 'broad'
  ) >= v_limit then
    raise exception using errcode = 'P0001', message = 'broad_invite_limit_reached';
  end if;

  perform public.invite_donor_to_request(v_request, invite_broad_donor.donor_id, 'broad');

  select * into v_response from public.donor_responses dr
  where dr.request_id = v_request.id and dr.donor_id = invite_broad_donor.donor_id;
  return v_response;
end;
$$;

-- Manager asks a donor to join the patient's network (§7.1, patient side).
create function public.request_connection_to_donor(
  patient_id uuid,
  donor_id uuid,
  tier public.connection_tier default 'regular'
)
returns public.patient_donor_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient public.patients;
  v_connection public.patient_donor_connections;
  v_active_count int;
  v_max int;
begin
  if not public.is_patient_manager(request_connection_to_donor.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_patient from public.patients p
  where p.id = request_connection_to_donor.patient_id and p.archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'patient_not_found';
  end if;

  if request_connection_to_donor.donor_id = auth.uid() or not exists (
    select 1
    from public.donor_profiles dp
    join public.profiles pr on pr.user_id = dp.user_id
    where dp.user_id = request_connection_to_donor.donor_id
      and pr.deleted_at is null
      and dp.blood_group = v_patient.blood_group
      and (
        dp.searchable
        or exists (
          select 1
          from public.donor_responses dr
          join public.blood_requests br on br.id = dr.request_id
          where dr.donor_id = dp.user_id
            and br.patient_id = v_patient.id
            and dr.status in ('accepted', 'donation_pending', 'completed')
        )
      )
  ) then
    raise exception using errcode = 'P0001', message = 'donor_not_available';
  end if;

  if exists (
    select 1 from public.patient_donor_connections c
    where c.patient_id = v_patient.id
      and c.donor_id = request_connection_to_donor.donor_id
      and c.status in ('requested', 'active', 'paused')
  ) then
    raise exception using errcode = 'P0001', message = 'connection_already_exists';
  end if;

  select count(*) into v_active_count
  from public.patient_donor_connections c
  where c.patient_id = v_patient.id and c.status in ('requested', 'active', 'paused');

  select coalesce((value #>> '{}')::int, 6) into v_max
  from public.app_settings where key = 'max_connected_donors';

  if v_active_count >= v_max then
    raise exception using errcode = 'P0001', message = 'donor_limit_reached';
  end if;

  insert into public.patient_donor_connections (patient_id, donor_id, tier, status, initiated_by, status_changed_by)
  values (v_patient.id, request_connection_to_donor.donor_id, request_connection_to_donor.tier, 'requested', 'patient_side', auth.uid())
  returning * into v_connection;

  perform public.enqueue_notification(
    v_connection.donor_id, 'connection_requested', 'patient_donor_connection', v_connection.id, '{}'::jsonb
  );

  return v_connection;
end;
$$;

-- Same signature as Phase 1. Changes: a donor accepting a patient-side
-- request keeps the tier the manager chose, and the acceptance notifies the
-- initiating side (managers) instead of the donor who just accepted.
create or replace function public.respond_connection(
  connection_id uuid,
  accept boolean,
  tier public.connection_tier default 'regular'
)
returns public.patient_donor_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.patient_donor_connections;
  v_after public.patient_donor_connections;
  v_active_count int;
  v_max int;
  v_caller_is_patient_side boolean;
  v_manager record;
begin
  select * into v_before
  from public.patient_donor_connections
  where id = connection_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'connection_not_found';
  end if;

  if v_before.status <> 'requested' then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  v_caller_is_patient_side := public.is_patient_manager(v_before.patient_id);

  -- Only the side that did NOT initiate may respond.
  if v_before.initiated_by = 'donor' and not v_caller_is_patient_side then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  elsif v_before.initiated_by = 'patient_side' and v_before.donor_id <> auth.uid() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if accept then
    select count(*) into v_active_count
    from public.patient_donor_connections
    where patient_id = v_before.patient_id
      and status in ('requested', 'active', 'paused')
      and id <> v_before.id;

    select coalesce((value #>> '{}')::int, 6) into v_max
    from public.app_settings where key = 'max_connected_donors';

    if v_active_count >= v_max then
      raise exception using errcode = 'P0001', message = 'donor_limit_reached';
    end if;

    update public.patient_donor_connections
    set status = 'active',
        tier = case when v_before.initiated_by = 'patient_side' then v_before.tier else respond_connection.tier end,
        status_changed_at = now(), status_changed_by = auth.uid()
    where id = connection_id
    returning * into v_after;

    if v_before.initiated_by = 'donor' then
      perform public.enqueue_notification(
        v_after.donor_id, 'connection_accepted', 'patient_donor_connection', v_after.id,
        jsonb_build_object('patient_id', v_after.patient_id)
      );
    else
      for v_manager in select user_id from public.patient_managers where patient_id = v_after.patient_id loop
        perform public.enqueue_notification(
          v_manager.user_id, 'connection_accepted', 'patient_donor_connection', v_after.id,
          jsonb_build_object('patient_id', v_after.patient_id)
        );
      end loop;
    end if;
  else
    update public.patient_donor_connections
    set status = 'declined', status_changed_at = now(), status_changed_by = auth.uid()
    where id = connection_id
    returning * into v_after;
  end if;

  return v_after;
end;
$$;

-- Managers see the display name of any donor invited to one of their
-- patient's requests (broad invitees aren't connected, so
-- shares_active_connection doesn't cover them). Display name only.
create function public.manages_request_with_donor(target_donor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.donor_responses dr
    join public.blood_requests br on br.id = dr.request_id
    join public.patient_managers pm on pm.patient_id = br.patient_id
    where dr.donor_id = target_donor_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace view public.public_profiles
with (security_invoker = false)
as
select p.user_id, p.display_name
from public.profiles p
where p.user_id = auth.uid()
   or public.is_admin()
   or public.shares_active_connection(p.user_id)
   or public.manages_request_with_donor(p.user_id);

-- The view is evaluated as its owner for tables but checks EXECUTE on the
-- functions it calls against the querying role (see 20260927141900).
grant execute on function public.manages_request_with_donor to authenticated;
grant execute on function public.search_broad_donors to authenticated;
grant execute on function public.invite_broad_donor to authenticated;
grant execute on function public.request_connection_to_donor to authenticated;
