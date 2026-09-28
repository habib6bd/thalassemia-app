-- Phase 1a RPCs: donor responses & donation confirmation (§7.3, §8, D2).
-- Accept means "I can donate" and never creates a donation (§28.2) — only
-- confirm_donation() does, and only a patient manager may call it.

create function public.respond_to_request(response_id uuid, accept boolean, reason text default null)
returns public.donor_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.donor_responses;
  v_request public.blood_requests;
  v_after public.donor_responses;
begin
  select * into v_before from public.donor_responses where id = response_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  if v_before.donor_id <> auth.uid() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_request from public.blood_requests where id = v_before.request_id;
  if v_request.status not in ('open', 'responding', 'partially_fulfilled') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if accept then
    if v_before.status not in ('invited', 'declined') then
      raise exception using errcode = 'P0001', message = 'invalid_transition';
    end if;

    if exists (
      select 1 from public.donor_responses dr
      join public.blood_requests br on br.id = dr.request_id
      where dr.donor_id = auth.uid()
        and dr.id <> response_id
        and dr.status in ('accepted', 'donation_pending')
        and br.status not in ('cancelled', 'expired', 'fulfilled')
    ) then
      raise exception using errcode = 'P0001', message = 'donor_has_active_commitment';
    end if;

    update public.donor_responses
    set status = 'accepted', responded_at = now(), status_changed_at = now(),
        status_changed_by = auth.uid(), reason = null
    where id = response_id
    returning * into v_after;

    perform public.enqueue_notification(
      m.user_id, 'response_accepted', 'blood_request', v_request.id, '{}'::jsonb
    )
    from public.patient_managers m where m.patient_id = v_request.patient_id;
  else
    if v_before.status <> 'invited' then
      raise exception using errcode = 'P0001', message = 'invalid_transition';
    end if;

    update public.donor_responses
    set status = 'declined', responded_at = now(), status_changed_at = now(),
        status_changed_by = auth.uid(), reason = respond_to_request.reason
    where id = response_id
    returning * into v_after;

    perform public.enqueue_notification(
      m.user_id, 'response_declined', 'blood_request', v_request.id, '{}'::jsonb
    )
    from public.patient_managers m where m.patient_id = v_request.patient_id;
  end if;

  perform public.recompute_request_status(v_request.id);

  return v_after;
end;
$$;

create function public.schedule_donation(response_id uuid, scheduled_at timestamptz)
returns public.donor_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.donor_responses;
  v_after public.donor_responses;
  v_patient_id uuid;
begin
  select * into v_before from public.donor_responses where id = response_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  select patient_id into v_patient_id from public.blood_requests where id = v_before.request_id;

  if v_before.donor_id <> auth.uid() and not public.is_patient_manager(v_patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status <> 'accepted' then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.donor_responses
  set status = 'donation_pending', scheduled_at = schedule_donation.scheduled_at,
      status_changed_at = now(), status_changed_by = auth.uid()
  where id = response_id
  returning * into v_after;


  return v_after;
end;
$$;

create function public.withdraw_response(response_id uuid, reason text default null)
returns public.donor_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.donor_responses;
  v_after public.donor_responses;
  v_request_id uuid;
begin
  select * into v_before from public.donor_responses where id = response_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  if v_before.donor_id <> auth.uid() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status not in ('accepted', 'donation_pending') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.donor_responses
  set status = 'cancelled', status_changed_at = now(), status_changed_by = auth.uid(),
      reason = withdraw_response.reason
  where id = response_id
  returning * into v_after;

  v_request_id := v_before.request_id;

  perform public.enqueue_notification(
    m.user_id, 'response_withdrawn', 'blood_request', v_request_id, '{}'::jsonb
  )
  from public.patient_managers m
  join public.blood_requests br on br.patient_id = m.patient_id
  where br.id = v_request_id;

  perform public.recompute_request_status(v_request_id);

  return v_after;
end;
$$;

-- A donor's own claim — not completion (§28.2). Notifies managers only.
create function public.report_donated(response_id uuid)
returns public.donor_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.donor_responses;
  v_after public.donor_responses;
  v_request_id uuid;
begin
  select * into v_before from public.donor_responses where id = response_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  if v_before.donor_id <> auth.uid() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_before.status not in ('accepted', 'donation_pending') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  update public.donor_responses
  set donor_reported_donated_at = now()
  where id = response_id
  returning * into v_after;

  v_request_id := v_before.request_id;

  perform public.enqueue_notification(
    m.user_id, 'donation_reported', 'blood_request', v_request_id, '{}'::jsonb
  )
  from public.patient_managers m
  join public.blood_requests br on br.patient_id = m.patient_id
  where br.id = v_request_id;


  return v_after;
end;
$$;

-- The ONLY function that creates a `donations` row (§28.2, D2). Only a
-- patient manager may call it, from `accepted` or `donation_pending`.
create function public.confirm_donation(response_id uuid, donated_on date)
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
  select * into v_response from public.donor_responses where id = response_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'response_not_found';
  end if;

  select * into v_request from public.blood_requests where id = v_response.request_id;

  if not public.is_patient_manager(v_request.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_response.status not in ('accepted', 'donation_pending') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  insert into public.donations (response_id, request_id, patient_id, donor_id, donated_on, verification, confirmed_by)
  values (response_id, v_request.id, v_request.patient_id, v_response.donor_id, donated_on, 'guardian_confirmed', auth.uid())
  returning * into v_donation;

  update public.donor_responses
  set status = 'completed', status_changed_at = now(), status_changed_by = auth.uid()
  where id = response_id;


  perform public.enqueue_notification(
    v_response.donor_id, 'donation_confirmed', 'blood_request', v_request.id, '{}'::jsonb
  );

  perform public.recompute_request_status(v_request.id);

  return v_donation;
end;
$$;

-- Keeps donor_profiles.last_donation_date in sync (ARCHITECTURE.md §5.3:
-- "display only", maintained by trigger, not direct client writes).
create function public.sync_last_donation_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.donor_profiles
  set last_donation_date = greatest(coalesce(last_donation_date, new.donated_on), new.donated_on)
  where user_id = new.donor_id;
  return new;
end;
$$;

create trigger sync_last_donation_date
  after insert on public.donations
  for each row execute function public.sync_last_donation_date();
