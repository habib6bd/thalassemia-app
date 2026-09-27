-- Phase 1a RPCs: patient-donor connections (§7.1, §8, D2).

create function public.request_connection_by_code(invite_code text)
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
  v_manager record;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if not public.has_role('donor') then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if not exists (select 1 from public.donor_profiles where user_id = auth.uid()) then
    raise exception using errcode = 'P0001', message = 'donor_profile_required';
  end if;

  select * into v_patient
  from public.patients
  where patients.invite_code = request_connection_by_code.invite_code
    and archived_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_invite_code';
  end if;

  if exists (
    select 1 from public.patient_donor_connections
    where patient_id = v_patient.id
      and donor_id = auth.uid()
      and status in ('requested', 'active', 'paused')
  ) then
    raise exception using errcode = 'P0001', message = 'connection_already_exists';
  end if;

  select count(*) into v_active_count
  from public.patient_donor_connections
  where patient_id = v_patient.id
    and status in ('requested', 'active', 'paused');

  select coalesce((value #>> '{}')::int, 6) into v_max
  from public.app_settings where key = 'max_connected_donors';

  if v_active_count >= v_max then
    raise exception using errcode = 'P0001', message = 'donor_limit_reached';
  end if;

  insert into public.patient_donor_connections (patient_id, donor_id, status, initiated_by, status_changed_by)
  values (v_patient.id, auth.uid(), 'requested', 'donor', auth.uid())
  returning * into v_connection;


  for v_manager in select user_id from public.patient_managers where patient_id = v_patient.id loop
    perform public.enqueue_notification(
      v_manager.user_id, 'connection_requested', 'patient_donor_connection', v_connection.id,
      jsonb_build_object('patient_id', v_patient.id)
    );
  end loop;

  return v_connection;
end;
$$;

create function public.respond_connection(
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
    set status = 'active', tier = respond_connection.tier,
        status_changed_at = now(), status_changed_by = auth.uid()
    where id = connection_id
    returning * into v_after;

    perform public.enqueue_notification(
      v_after.donor_id, 'connection_accepted', 'patient_donor_connection', v_after.id,
      jsonb_build_object('patient_id', v_after.patient_id)
    );
  else
    update public.patient_donor_connections
    set status = 'declined', status_changed_at = now(), status_changed_by = auth.uid()
    where id = connection_id
    returning * into v_after;
  end if;


  return v_after;
end;
$$;

create function public.cancel_connection_request(connection_id uuid)
returns public.patient_donor_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.patient_donor_connections;
  v_after public.patient_donor_connections;
  v_is_initiator boolean;
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

  if v_before.initiated_by = 'donor' then
    v_is_initiator := v_before.donor_id = auth.uid();
  else
    v_is_initiator := public.is_patient_manager(v_before.patient_id);
  end if;

  if not v_is_initiator then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  update public.patient_donor_connections
  set status = 'cancelled', status_changed_at = now(), status_changed_by = auth.uid()
  where id = connection_id
  returning * into v_after;


  return v_after;
end;
$$;

create function public.set_connection_status(
  connection_id uuid,
  new_status public.connection_status,
  reason text default null
)
returns public.patient_donor_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.patient_donor_connections;
  v_after public.patient_donor_connections;
  v_is_party boolean;
  v_valid boolean := false;
begin
  if new_status not in ('paused', 'active', 'removed') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  select * into v_before
  from public.patient_donor_connections
  where id = connection_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'connection_not_found';
  end if;

  v_is_party := v_before.donor_id = auth.uid() or public.is_patient_manager(v_before.patient_id);
  if not v_is_party then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status = 'active' and new_status in ('paused', 'removed') then
    v_valid := true;
  elsif v_before.status = 'paused' and new_status in ('active', 'removed') then
    v_valid := true;
  end if;

  if not v_valid then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.patient_donor_connections
  set status = new_status,
      status_changed_at = now(),
      status_changed_by = auth.uid(),
      end_reason = case when new_status = 'removed' then reason else end_reason end
  where id = connection_id
  returning * into v_after;


  if new_status = 'removed' then
    perform public.enqueue_notification(
      case when auth.uid() = v_after.donor_id then
        (select user_id from public.patient_managers where patient_id = v_after.patient_id and is_primary limit 1)
      else v_after.donor_id end,
      'connection_ended', 'patient_donor_connection', v_after.id,
      jsonb_build_object('patient_id', v_after.patient_id)
    );
  end if;

  return v_after;
end;
$$;

create function public.set_connection_tier(connection_id uuid, tier public.connection_tier)
returns public.patient_donor_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.patient_donor_connections;
  v_after public.patient_donor_connections;
begin
  select * into v_before
  from public.patient_donor_connections
  where id = connection_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'connection_not_found';
  end if;

  if not public.is_patient_manager(v_before.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status not in ('requested', 'active', 'paused') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.patient_donor_connections
  set tier = set_connection_tier.tier
  where id = connection_id
  returning * into v_after;


  return v_after;
end;
$$;
