-- Function EXECUTE lockdown (D2/D3). Pins exactly which functions in
-- `public` the app roles may call. Adding a client RPC means adding it to
-- the allow-list here on purpose; anything else is a leak.
begin;
select plan(4);

create or replace function pg_temp.expect_error(query text, expected text) returns text
language plpgsql as $$
begin
  execute query;
  return 'NO ERROR RAISED';
exception when others then
  return case when sqlerrm = expected then 'OK' else 'WRONG ERROR: ' || sqlerrm end;
end;
$$;
grant execute on function pg_temp.expect_error(text, text) to authenticated, anon;

create temp view own_functions as
select p.oid, p.proname::text as name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not exists (
    select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
  );

select is_empty(
  $$select name from own_functions where has_function_privilege('anon', oid, 'execute')$$,
  'anon can execute no function in public'
);

select set_eq(
  $$select name from own_functions where has_function_privilege('authenticated', oid, 'execute')$$,
  array[
    -- RLS/view helpers
    'has_role', 'is_admin', 'is_patient_manager', 'manages_connected_donor',
    'is_connected_donor', 'is_invited_donor', 'shares_active_connection',
    'manages_request_with_donor',
    -- identity / patients / connections
    'complete_onboarding', 'add_role', 'upsert_donor_profile', 'create_patient',
    'update_patient', 'rotate_invite_code', 'request_connection_by_code',
    'respond_connection', 'cancel_connection_request', 'set_connection_status',
    'set_connection_tier', 'get_connection_parties', 'request_connection_to_donor',
    -- requests / responses
    'create_blood_request', 'update_blood_request', 'publish_blood_request',
    'cancel_blood_request', 'get_request_for_donor', 'respond_to_request',
    'schedule_donation', 'withdraw_response', 'report_donated', 'confirm_donation',
    'get_response_contact', 'widen_request_search', 'search_broad_donors',
    'invite_broad_donor',
    -- notifications
    'mark_notification_read', 'mark_all_notifications_read', 'register_push_token'
  ],
  'authenticated can execute exactly the client RPCs and RLS/view helpers'
);

select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  pg_temp.expect_error(
    $$select public.enqueue_notification(gen_random_uuid(), 'request_invited', null, null)$$,
    'permission denied for function enqueue_notification'
  ),
  'OK',
  'a signed-in user cannot send notifications to other users directly'
);

select is(
  pg_temp.expect_error(
    $$select public.write_audit('forged', 'blood_requests', gen_random_uuid(), null, null)$$,
    'permission denied for function write_audit'
  ),
  'OK',
  'a signed-in user cannot write audit log entries directly'
);

reset role;
select * from finish();
rollback;
