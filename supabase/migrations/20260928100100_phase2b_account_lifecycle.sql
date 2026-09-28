-- Phase 2b: account deletion + data export (phase-2.md 2b, OPEN_QUESTIONS Q21).
--
-- delete_my_account() does all data changes in one transaction. The
-- `delete-account` Edge Function calls it with the user's JWT and then
-- soft-deletes the auth user (service role) so they can no longer sign in.
-- The auth row is kept (soft delete) because donations still reference the
-- donor profile; the donor is shown as "deleted user" from then on.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_response public.donor_responses;
  v_connection public.patient_donor_connections;
  v_manager public.patient_managers;
  v_request_id uuid;
  v_primary uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select * into v_profile from public.profiles where user_id = v_uid for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;
  if v_profile.deleted_at is not null then
    return; -- idempotent: the Edge Function may retry after a partial failure
  end if;

  -- 1. Donor side: close open responses without penalty (§28.3).
  for v_response in
    select * from public.donor_responses
    where donor_id = v_uid and status in ('invited', 'accepted', 'donation_pending')
    for update
  loop
    update public.donor_responses
    set status = (case when v_response.status = 'invited' then 'declined' else 'cancelled' end)::public.response_status,
        status_changed_at = now(), status_changed_by = v_uid, reason = 'account_deleted'
    where id = v_response.id;

    if v_response.status <> 'invited' then
      perform public.enqueue_notification(
        m.user_id, 'response_withdrawn', 'blood_request', v_response.request_id, '{}'::jsonb
      )
      from public.patient_managers m
      join public.blood_requests br on br.patient_id = m.patient_id
      where br.id = v_response.request_id;
    end if;

    perform public.recompute_request_status(v_response.request_id);
  end loop;

  -- 2. Donor side: leave every patient network.
  for v_connection in
    select * from public.patient_donor_connections
    where donor_id = v_uid and status in ('requested', 'active', 'paused')
    for update
  loop
    update public.patient_donor_connections
    set status = (case when v_connection.status = 'requested' then 'cancelled' else 'removed' end)::public.connection_status,
        status_changed_at = now(), status_changed_by = v_uid, end_reason = 'account_deleted'
    where id = v_connection.id;

    if v_connection.status <> 'requested' then
      select user_id into v_primary from public.patient_managers
      where patient_id = v_connection.patient_id and is_primary limit 1;
      if v_primary is not null then
        perform public.enqueue_notification(
          v_primary, 'connection_ended', 'patient_donor_connection', v_connection.id,
          jsonb_build_object('patient_id', v_connection.patient_id)
        );
      end if;
    end if;
  end loop;

  update public.donor_profiles
  set availability = 'paused', searchable = false, emergency_available = false, available_from = null
  where user_id = v_uid;

  -- 3. Manager side: hand over, or close the patient if nobody else manages it.
  for v_manager in
    select * from public.patient_managers where user_id = v_uid
  loop
    perform 1 from public.patients where id = v_manager.patient_id for update;

    if exists (
      select 1 from public.patient_managers
      where patient_id = v_manager.patient_id and user_id <> v_uid
    ) then
      delete from public.patient_managers
      where patient_id = v_manager.patient_id and user_id = v_uid;
      perform public.ensure_primary_manager(v_manager.patient_id);
    else
      -- Last manager: cancel open requests (still a manager here, so the
      -- normal RPC's checks and donor notifications apply).
      for v_request_id in
        select id from public.blood_requests
        where patient_id = v_manager.patient_id
          and status in ('draft', 'open', 'responding', 'partially_fulfilled')
      loop
        perform public.cancel_blood_request(v_request_id, 'account_deleted');
      end loop;

      for v_connection in
        select * from public.patient_donor_connections
        where patient_id = v_manager.patient_id and status in ('requested', 'active', 'paused')
        for update
      loop
        update public.patient_donor_connections
        set status = (case when v_connection.status = 'requested' then 'cancelled' else 'removed' end)::public.connection_status,
            status_changed_at = now(), status_changed_by = v_uid, end_reason = 'account_deleted'
        where id = v_connection.id;

        if v_connection.status <> 'requested' then
          perform public.enqueue_notification(
            v_connection.donor_id, 'connection_ended', 'patient_donor_connection', v_connection.id,
            jsonb_build_object('patient_id', v_connection.patient_id)
          );
        end if;
      end loop;

      update public.guardian_invites
      set revoked_at = now()
      where patient_id = v_manager.patient_id and accepted_at is null and revoked_at is null;

      update public.blood_requests set notes = null, area = null
      where patient_id = v_manager.patient_id;

      update public.patients
      set display_name = 'deleted',
          thalassemia_type = null,
          treating_centre = null,
          area = null,
          next_transfusion_date = null,
          invite_code = public.generate_invite_code(),
          archived_at = now()
      where id = v_manager.patient_id;

      delete from public.patient_managers
      where patient_id = v_manager.patient_id and user_id = v_uid;
    end if;
  end loop;

  -- 4. Personal data.
  update public.guardian_invites set revoked_at = now()
  where created_by = v_uid and accepted_at is null and revoked_at is null;

  delete from public.appreciation_messages where recipient_id = v_uid;
  delete from public.push_tokens where user_id = v_uid;
  delete from public.notification_preferences where user_id = v_uid;
  delete from public.notifications where user_id = v_uid;
  delete from public.user_roles where user_id = v_uid;

  update public.profiles
  set display_name = 'deleted',
      phone = null,
      area = null,
      district_id = null,
      share_contact_on_accept = false,
      deleted_at = now()
  where user_id = v_uid;

  perform public.write_audit('account_deleted', 'profiles', v_uid, null, null);
end;
$$;

-- Everything the app stores about the caller, as one JSON document.
-- Other people's personal data (donor names, co-manager contacts) is left out.
create function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = v_uid),
    'roles', coalesce((select jsonb_agg(r.role) from public.user_roles r where r.user_id = v_uid), '[]'::jsonb),
    'donor_profile', (select to_jsonb(d) from public.donor_profiles d where d.user_id = v_uid),
    'managed_patients', coalesce((
      select jsonb_agg(to_jsonb(pt) - 'invite_code' || jsonb_build_object('relation', pm.relation, 'is_primary', pm.is_primary))
      from public.patient_managers pm
      join public.patients pt on pt.id = pm.patient_id
      where pm.user_id = v_uid
    ), '[]'::jsonb),
    'blood_requests_created', coalesce((
      select jsonb_agg(to_jsonb(br)) from public.blood_requests br where br.created_by = v_uid
    ), '[]'::jsonb),
    'donor_connections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'patient_id', c.patient_id, 'tier', c.tier, 'status', c.status,
        'created_at', c.created_at, 'status_changed_at', c.status_changed_at))
      from public.patient_donor_connections c where c.donor_id = v_uid
    ), '[]'::jsonb),
    'donor_responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'request_id', r.request_id, 'status', r.status, 'scheduled_at', r.scheduled_at,
        'donor_reported_donated_at', r.donor_reported_donated_at, 'created_at', r.created_at))
      from public.donor_responses r where r.donor_id = v_uid
    ), '[]'::jsonb),
    'donations_given', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'donated_on', d.donated_on, 'verification', d.verification))
      from public.donations d where d.donor_id = v_uid
    ), '[]'::jsonb),
    'appreciation_received', coalesce((
      select jsonb_agg(jsonb_build_object('message', a.message, 'created_at', a.created_at))
      from public.appreciation_messages a where a.recipient_id = v_uid and a.removed_at is null
    ), '[]'::jsonb),
    'appreciation_sent', coalesce((
      select jsonb_agg(jsonb_build_object('message', a.message, 'created_at', a.created_at))
      from public.appreciation_messages a where a.sender_id = v_uid
    ), '[]'::jsonb),
    'notification_preferences', coalesce((
      select jsonb_agg(to_jsonb(n) - 'user_id') from public.notification_preferences n where n.user_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.delete_my_account to authenticated;
grant execute on function public.export_my_data to authenticated;
