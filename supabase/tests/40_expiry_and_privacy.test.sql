-- Phase 1a pgTAP: request expiry (§11), removed-donor privacy (§9), and the
-- schedule/withdraw/report_donated donor-response transitions.
begin;
select plan(8);

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

create temp table fx (k text, v text);
grant all on fx to authenticated, anon, service_role;

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'g@test.local'),
  ('e0000000-0000-0000-0000-000000000002', 'd1@test.local');

select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'patient_id', (public.create_patient(display_name => 'Exp Patient', blood_group => 'B_NEG', district_id => 1)).id::text;
insert into fx select 'invite_code', (select invite_code from public.patients where id = (select v::uuid from fx where k = 'patient_id'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile('B_NEG'::public.blood_group);
insert into fx select 'conn', id::text from public.request_connection_by_code((select v from fx where k = 'invite_code'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.respond_connection((select v::uuid from fx where k = 'conn'), true, 'regular');
insert into fx select 'request_id', (public.create_blood_request(
  patient_id => (select v::uuid from fx where k = 'patient_id'),
  required_at => now() - interval '3 days',
  treating_centre => 'Test Hospital',
  district_id => 1,
  units_needed => 1
)).id::text;
select public.publish_blood_request((select v::uuid from fx where k = 'request_id'));
reset role;

insert into fx select 'response_id', id::text from public.donor_responses
where request_id = (select v::uuid from fx where k = 'request_id');

-- required_at is already 3 days in the past, well past the 24h grace period.
select public.process_request_timers();
select is(
  (select status from public.blood_requests where id = (select v::uuid from fx where k = 'request_id')),
  'expired'::public.request_status,
  'process_request_timers expires a request past required_at + grace'
);
select is(
  (select status from public.donor_responses where id = (select v::uuid from fx where k = 'response_id')),
  'expired'::public.response_status,
  'the invited response is expired along with the request'
);

-- schedule_donation / withdraw_response / report_donated on a second request.
select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into fx select 'request2_id', (public.create_blood_request(
  patient_id => (select v::uuid from fx where k = 'patient_id'),
  required_at => now() + interval '2 days',
  treating_centre => 'Test Hospital',
  district_id => 1,
  units_needed => 1
)).id::text;
select public.publish_blood_request((select v::uuid from fx where k = 'request2_id'));
reset role;

insert into fx select 'response2_id', id::text from public.donor_responses
where request_id = (select v::uuid from fx where k = 'request2_id');

select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.respond_to_request((select v::uuid from fx where k = 'response2_id'), true);
select is(
  (select status from public.schedule_donation((select v::uuid from fx where k = 'response2_id'), now() + interval '1 day')),
  'donation_pending'::public.response_status,
  'schedule_donation moves accepted -> donation_pending'
);
select public.report_donated((select v::uuid from fx where k = 'response2_id'));
select isnt(
  (select donor_reported_donated_at from public.donor_responses where id = (select v::uuid from fx where k = 'response2_id')),
  null,
  'report_donated records the donor''s own claim'
);
select is(
  (select status from public.donor_responses where id = (select v::uuid from fx where k = 'response2_id')),
  'donation_pending'::public.response_status,
  'report_donated does NOT change the response status (it is a claim, not completion)'
);
select is((select count(*)::int from public.donations), 0, 'report_donated does not create a donations row');

select is(
  (select status from public.withdraw_response((select v::uuid from fx where k = 'response2_id'), 'changed my mind'))::text,
  'cancelled',
  'withdraw_response cancels a donation_pending response'
);
reset role;

-- Removed donor: remove the connection, then the donor can no longer see the patient card.
select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.set_connection_status((select v::uuid from fx where k = 'conn'), 'removed', 'test cleanup');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'e0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is_empty(
  $$select 1 from public.patient_cards_for_donor where display_name = 'Exp Patient'$$,
  'a removed donor can no longer see the patient card'
);
reset role;

select * from finish();
rollback;
