-- Phase 2a: tiered invitations, escalation and emergency publish
-- (ARCHITECTURE §7.2; OPEN_QUESTIONS Q13, Q15, Q17, Q18).

alter table public.blood_requests
  add column emergency_acknowledged_at timestamptz null;

insert into public.app_settings (key, value, description) values
  ('broad_invite_limit', '20', 'Phase 2a: max donors outside the patient''s network invited to one request (manual broad invites + emergency donors). Product rule, not medical.');

update public.app_settings
set description = 'Hours regular donors get before backup donors are invited (OPEN_QUESTIONS Q13, Q17). Emergency requests skip the wait.'
where key = 'regular_response_window_hours';

-- Internal: invite one donor (no-op if already invited). Returns true if a
-- new invite was created.
create function public.invite_donor_to_request(
  p_request public.blood_requests,
  p_donor_id uuid,
  p_via public.request_tier
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.donor_responses (request_id, donor_id, invited_via, status)
  values (p_request.id, p_donor_id, p_via, 'invited')
  on conflict (request_id, donor_id) do nothing;

  if not found then
    return false;
  end if;

  perform public.enqueue_notification(
    p_donor_id, 'request_invited', 'blood_request', p_request.id,
    jsonb_build_object('district_id', p_request.district_id, 'is_emergency', p_request.is_emergency)
  );
  return true;
end;
$$;

-- Internal: invite the patient's active connections of the given tiers
-- with an exact blood-group match (D7) that aren't paused.
create function public.invite_connected_donors(
  p_request public.blood_requests,
  p_tiers public.connection_tier[]
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_donor record;
  v_count int := 0;
begin
  for v_donor in
    select c.donor_id, c.tier
    from public.patient_donor_connections c
    join public.donor_profiles dp on dp.user_id = c.donor_id
    where c.patient_id = p_request.patient_id
      and c.status = 'active'
      and c.tier = any (p_tiers)
      and dp.blood_group = p_request.blood_group
      and dp.availability <> 'paused'
  loop
    if public.invite_donor_to_request(p_request, v_donor.donor_id, v_donor.tier::text::public.request_tier) then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Internal: may this donor be invited from outside the patient's network?
-- `p_emergency` switches the opt-in: `emergency_available` for emergency
-- invites (Q18), `searchable` for broad search. Never the patient's own
-- managers.
create function public.is_broad_eligible_donor(
  p_request public.blood_requests,
  p_donor_id uuid,
  p_emergency boolean,
  p_include_division boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.donor_profiles dp
    join public.profiles pr on pr.user_id = dp.user_id
    where dp.user_id = p_donor_id
      and case when p_emergency then dp.emergency_available else dp.searchable end
      and dp.blood_group = p_request.blood_group
      and dp.availability = 'available'
      and pr.deleted_at is null
      and (
        pr.district_id = p_request.district_id
        or (
          p_include_division
          and exists (
            select 1
            from public.districts mine
            join public.districts theirs on theirs.division_id = mine.division_id
            where mine.id = p_request.district_id and theirs.id = pr.district_id
          )
        )
      )
      and not exists (
        select 1 from public.patient_managers pm
        where pm.patient_id = p_request.patient_id and pm.user_id = dp.user_id
      )
  );
$$;

-- Internal: emergency opt-in donors in the request's district (Q18).
-- Takes the id, not the row: a function whose only argument is a table row
-- is exposed by PostgREST as a computed column of that table.
create function public.invite_emergency_donors(p_request_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  p_request public.blood_requests;
  v_limit int;
  v_donor record;
  v_count int := 0;
begin
  select * into p_request from public.blood_requests where id = p_request_id;

  select coalesce((value #>> '{}')::int, 20) into v_limit
  from public.app_settings where key = 'broad_invite_limit';

  for v_donor in
    select dp.user_id
    from public.donor_profiles dp
    where dp.emergency_available
      and dp.blood_group = p_request.blood_group
      and dp.availability = 'available'
      and public.is_broad_eligible_donor(p_request, dp.user_id, true, false)
      and not exists (
        select 1 from public.donor_responses dr
        where dr.request_id = p_request.id and dr.donor_id = dp.user_id
      )
    order by dp.updated_at desc
    limit v_limit
  loop
    if public.invite_donor_to_request(p_request, v_donor.user_id, 'broad') then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- New signature (extra optional arguments), so the Phase 1 version is
-- dropped rather than overloaded.
drop function public.publish_blood_request(uuid);

create function public.publish_blood_request(
  request_id uuid,
  emergency_acknowledged boolean default false,
  notify_emergency_donors boolean default false
)
returns public.blood_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.blood_requests;
  v_after public.blood_requests;
  v_tier public.request_tier;
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

  -- §22 / CLAUDE.md #7: the manager must have seen the "not an emergency
  -- service" notice. Enforced here so no client can skip it.
  if v_before.is_emergency and not coalesce(emergency_acknowledged, false) then
    raise exception using errcode = 'P0001', message = 'emergency_disclaimer_required';
  end if;

  v_tier := case
    when not v_before.is_emergency then 'regular'
    when coalesce(notify_emergency_donors, false) then 'broad'
    else 'backup'
  end;

  update public.blood_requests
  set status = 'open',
      published_at = now(),
      current_tier = v_tier,
      tier_changed_at = now(),
      emergency_acknowledged_at = case when v_before.is_emergency then now() end
  where id = request_id
  returning * into v_after;

  if v_after.is_emergency then
    perform public.invite_connected_donors(v_after, array['regular', 'backup']::public.connection_tier[]);
    if coalesce(notify_emergency_donors, false) then
      perform public.invite_emergency_donors(v_after.id);
    end if;
  else
    perform public.invite_connected_donors(v_after, array['regular']::public.connection_tier[]);
  end if;

  return v_after;
end;
$$;

-- Same signature as Phase 1: expiry is unchanged; escalation is new.
create or replace function public.process_request_timers()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grace_hours int;
  v_window_hours int;
  v_request record;
  v_response record;
  v_escalated public.blood_requests;
  v_invited int;
  v_manager record;
begin
  select coalesce((value #>> '{}')::int, 24) into v_grace_hours
  from public.app_settings where key = 'request_expiry_grace_hours';

  for v_request in
    select * from public.blood_requests
    where status in ('open', 'responding', 'partially_fulfilled')
      and required_at + make_interval(hours => v_grace_hours) < now()
    for update
  loop
    update public.blood_requests
    set status = 'expired', closed_at = now()
    where id = v_request.id;

    for v_response in
      select * from public.donor_responses
      where request_id = v_request.id and status in ('invited', 'accepted', 'donation_pending')
    loop
      update public.donor_responses
      set status = 'expired', status_changed_at = now()
      where id = v_response.id;

      perform public.enqueue_notification(
        v_response.donor_id, 'request_cancelled', 'blood_request', v_request.id, '{}'::jsonb
      );
    end loop;
  end loop;

  -- Escalation regular -> backup (Q17): short of donors, and either the
  -- window passed or no regular invite is still waiting for an answer.
  select coalesce((value #>> '{}')::int, 6) into v_window_hours
  from public.app_settings where key = 'regular_response_window_hours';

  for v_request in
    select br.* from public.blood_requests br
    where br.status in ('open', 'responding', 'partially_fulfilled')
      and br.current_tier = 'regular'
      and not br.is_emergency
      and (
        br.published_at + make_interval(hours => v_window_hours) <= now()
        or not exists (
          select 1 from public.donor_responses dr
          where dr.request_id = br.id and dr.status = 'invited'
        )
      )
      and (
        select count(*) from public.donor_responses dr
        where dr.request_id = br.id and dr.status in ('accepted', 'donation_pending', 'completed')
      ) < br.units_needed
    for update
  loop
    update public.blood_requests
    set current_tier = 'backup', tier_changed_at = now()
    where id = v_request.id
    returning * into v_escalated;

    v_invited := public.invite_connected_donors(v_escalated, array['backup']::public.connection_tier[]);

    for v_manager in
      select user_id from public.patient_managers where patient_id = v_escalated.patient_id
    loop
      perform public.enqueue_notification(
        v_manager.user_id, 'request_escalated', 'blood_request', v_escalated.id,
        jsonb_build_object('invited_count', v_invited)
      );
    end loop;
  end loop;
end;
$$;

-- Manager: backup -> broad. Idempotent at broad.
create function public.widen_request_search(request_id uuid)
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

  if v_before.status not in ('open', 'responding', 'partially_fulfilled') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if v_before.current_tier = 'broad' then
    return v_before;
  end if;

  if v_before.current_tier = 'regular' then
    raise exception using errcode = 'P0001', message = 'search_not_available_yet';
  end if;

  update public.blood_requests
  set current_tier = 'broad', tier_changed_at = now()
  where id = request_id
  returning * into v_after;

  return v_after;
end;
$$;

grant execute on function public.publish_blood_request to authenticated;
grant execute on function public.widen_request_search to authenticated;
