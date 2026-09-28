-- Phase 1a RPCs: blood requests + status derivation (§7.2, §8, §9, D2).

create function public.create_blood_request(
  patient_id uuid,
  required_at timestamptz,
  treating_centre text,
  district_id int,
  -- `integer`, not the column's `smallint`: PostgREST/JSON callers send
  -- plain numbers, and named-argument dispatch does not apply the
  -- assignment-level int4->int2 cast that a bare literal call would get.
  units_needed integer default 1,
  blood_group public.blood_group default null,
  component text default null,
  area text default null,
  is_emergency boolean default false,
  notes text default null
)
returns public.blood_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient public.patients;
  v_request public.blood_requests;
begin
  if not public.is_patient_manager(patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_patient from public.patients where id = patient_id and archived_at is null;
  if not found then
    raise exception using errcode = 'P0001', message = 'patient_not_found';
  end if;

  begin
    insert into public.blood_requests (
      patient_id, created_by, blood_group, component, units_needed, required_at,
      treating_centre, district_id, area, is_emergency, notes
    )
    values (
      patient_id, auth.uid(), coalesce(blood_group, v_patient.blood_group), component,
      units_needed, required_at, treating_centre, district_id, area, is_emergency, notes
    )
    returning * into v_request;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'duplicate_request';
  end;


  return v_request;
end;
$$;

create function public.update_blood_request(
  request_id uuid,
  blood_group public.blood_group default null,
  component text default null,
  units_needed integer default null,
  required_at timestamptz default null,
  treating_centre text default null,
  district_id int default null,
  area text default null,
  is_emergency boolean default null,
  notes text default null
)
returns public.blood_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.blood_requests;
  v_after public.blood_requests;
begin
  select * into v_before from public.blood_requests where id = request_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if not public.is_patient_manager(v_before.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  begin
    update public.blood_requests set
      blood_group = coalesce(update_blood_request.blood_group, blood_requests.blood_group),
      component = coalesce(update_blood_request.component, blood_requests.component),
      units_needed = coalesce(update_blood_request.units_needed, blood_requests.units_needed),
      required_at = coalesce(update_blood_request.required_at, blood_requests.required_at),
      treating_centre = coalesce(update_blood_request.treating_centre, blood_requests.treating_centre),
      district_id = coalesce(update_blood_request.district_id, blood_requests.district_id),
      area = coalesce(update_blood_request.area, blood_requests.area),
      is_emergency = coalesce(update_blood_request.is_emergency, blood_requests.is_emergency),
      notes = coalesce(update_blood_request.notes, blood_requests.notes)
    where id = request_id
    returning * into v_after;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'duplicate_request';
  end;


  return v_after;
end;
$$;

create function public.publish_blood_request(request_id uuid)
returns public.blood_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.blood_requests;
  v_after public.blood_requests;
  v_donor record;
begin
  select * into v_before from public.blood_requests where id = request_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if not public.is_patient_manager(v_before.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.blood_requests
  set status = 'open', published_at = now()
  where id = request_id
  returning * into v_after;

  -- Phase 1 invitation rule: all active connections with an exact
  -- blood-group match and availability <> 'paused'. Tiered escalation is
  -- Phase 2 (current_tier stays 'regular' for now).
  for v_donor in
    select dp.user_id
    from public.patient_donor_connections c
    join public.donor_profiles dp on dp.user_id = c.donor_id
    where c.patient_id = v_after.patient_id
      and c.status = 'active'
      and dp.blood_group = v_after.blood_group
      and dp.availability <> 'paused'
  loop
    insert into public.donor_responses (request_id, donor_id, invited_via, status)
    values (v_after.id, v_donor.user_id, v_after.current_tier, 'invited');

    perform public.enqueue_notification(
      v_donor.user_id, 'request_invited', 'blood_request', v_after.id,
      jsonb_build_object('district_id', v_after.district_id, 'is_emergency', v_after.is_emergency)
    );
  end loop;


  return v_after;
end;
$$;

create function public.cancel_blood_request(request_id uuid, reason text default null)
returns public.blood_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.blood_requests;
  v_after public.blood_requests;
  v_response record;
begin
  select * into v_before from public.blood_requests where id = request_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if not public.is_patient_manager(v_before.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status not in ('draft', 'open', 'responding', 'partially_fulfilled') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.blood_requests
  set status = 'cancelled', cancel_reason = reason, closed_at = now()
  where id = request_id
  returning * into v_after;

  for v_response in
    select * from public.donor_responses
    where donor_responses.request_id = v_after.id and status in ('invited', 'accepted', 'donation_pending')
  loop
    update public.donor_responses
    set status = 'cancelled', status_changed_at = now(), reason = 'request_cancelled'
    where id = v_response.id;

    perform public.enqueue_notification(
      v_response.donor_id, 'request_cancelled', 'blood_request', v_after.id, '{}'::jsonb
    );
  end loop;


  return v_after;
end;
$$;

-- Internal only (not granted to clients): recomputes status purely from the
-- current donor_responses counts (§7.2 — status is derived, not stored as
-- a ratchet), and cascades the fulfilled-request side effects.
create function public.recompute_request_status(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.blood_requests;
  v_completed int;
  v_active int;
  v_new_status public.request_status;
  v_response record;
begin
  select * into v_request from public.blood_requests where id = request_id for update;
  if not found or v_request.status in ('cancelled', 'expired') then
    return;
  end if;

  select count(*) filter (where status = 'completed'),
         count(*) filter (where status in ('accepted', 'donation_pending'))
    into v_completed, v_active
  from public.donor_responses
  where donor_responses.request_id = v_request.id;

  if v_completed >= v_request.units_needed then
    v_new_status := 'fulfilled';
  elsif v_completed > 0 then
    v_new_status := 'partially_fulfilled';
  elsif v_active > 0 then
    v_new_status := 'responding';
  else
    v_new_status := 'open';
  end if;

  if v_new_status = v_request.status then
    return;
  end if;

  update public.blood_requests
  set status = v_new_status, closed_at = case when v_new_status = 'fulfilled' then now() else closed_at end
  where id = request_id;


  if v_new_status = 'fulfilled' then
    for v_response in
      select * from public.donor_responses
      where donor_responses.request_id = v_request.id and status in ('invited', 'accepted', 'donation_pending')
    loop
      update public.donor_responses
      set status = (case when v_response.status = 'invited' then 'expired' else 'cancelled' end)::public.response_status,
          status_changed_at = now(),
          reason = case when v_response.status = 'invited' then null else 'request_fulfilled' end
      where id = v_response.id;

      perform public.enqueue_notification(
        v_response.donor_id, 'request_fulfilled', 'blood_request', v_request.id, '{}'::jsonb
      );
    end loop;
  end if;
end;
$$;

-- §9: minimal fields only, and the patient's display_name only if the donor
-- is also a connected donor for that patient. No thalassemia_type, ever.
create function public.get_request_for_donor(request_id uuid)
returns table (
  id uuid,
  patient_display_name text,
  blood_group public.blood_group,
  component text,
  units_needed smallint,
  required_at timestamptz,
  treating_centre text,
  district_id int,
  area text,
  is_emergency boolean,
  status public.request_status,
  my_response_status public.response_status
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_invited_donor(request_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return query
  select
    br.id, case when public.is_connected_donor(br.patient_id) then p.display_name end,
    br.blood_group, br.component, br.units_needed, br.required_at, br.treating_centre,
    br.district_id, br.area, br.is_emergency, br.status, dr.status
  from public.blood_requests br
  join public.patients p on p.id = br.patient_id
  join public.donor_responses dr on dr.request_id = br.id and dr.donor_id = auth.uid()
  where br.id = get_request_for_donor.request_id;
end;
$$;
