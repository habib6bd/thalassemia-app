-- Phase 1a pgTAP: blood request + donor response state machines (§7.2, §7.3),
-- duplicate-request rejection, donor active-commitment conflict, accept vs.
-- confirmed-donation, and full-fulfilment cascade.
begin;
select plan(13);

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
  ('d0000000-0000-0000-0000-000000000001', 'g@test.local'),
  ('d0000000-0000-0000-0000-000000000002', 'd1@test.local'),
  ('d0000000-0000-0000-0000-000000000003', 'd2@test.local');

-- Guardian + patient + two connected AB_POS donors.
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'patient_id', (public.create_patient(display_name => 'Req Patient', blood_group => 'AB_POS', district_id => 1)).id::text;
insert into fx select 'invite_code', (select invite_code from public.patients where id = (select v::uuid from fx where k = 'patient_id'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor 1', null, 1, null, 'bn', false);
select public.upsert_donor_profile('AB_POS'::public.blood_group);
insert into fx select 'conn1', id::text from public.request_connection_by_code((select v from fx where k = 'invite_code'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor 2', null, 1, null, 'bn', false);
select public.upsert_donor_profile('AB_POS'::public.blood_group);
insert into fx select 'conn2', id::text from public.request_connection_by_code((select v from fx where k = 'invite_code'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.respond_connection((select v::uuid from fx where k = 'conn1'), true, 'regular');
select public.respond_connection((select v::uuid from fx where k = 'conn2'), true, 'regular');

-- Create + publish a 1-unit request; both connected AB_POS donors get invited.
insert into fx select 'request_id', (public.create_blood_request(
  patient_id => (select v::uuid from fx where k = 'patient_id'),
  required_at => now() + interval '2 days',
  treating_centre => 'Test Hospital',
  district_id => 1,
  units_needed => 1
)).id::text;

-- Duplicate: same patient, same required_at day, still non-terminal.
select is(
  pg_temp.expect_error(
    format(
      $$select public.create_blood_request(patient_id => '%s'::uuid, required_at => now() + interval '2 days', treating_centre => 'X', district_id => 1, units_needed => 1)$$,
      (select v from fx where k = 'patient_id')
    ),
    'duplicate_request'
  ),
  'OK',
  'a second non-terminal request for the same patient/day is rejected'
);

select public.publish_blood_request((select v::uuid from fx where k = 'request_id'));
select is(
  (select count(*)::int from public.donor_responses where request_id = (select v::uuid from fx where k = 'request_id')),
  2,
  'publishing invites every connected donor with an exact blood-group match'
);
reset role;

insert into fx select 'response1', id::text from public.donor_responses dr
  join fx f on f.k = 'request_id' and dr.request_id = f.v::uuid
  where dr.donor_id = 'd0000000-0000-0000-0000-000000000002';
insert into fx select 'response2', id::text from public.donor_responses dr
  join fx f on f.k = 'request_id' and dr.request_id = f.v::uuid
  where dr.donor_id = 'd0000000-0000-0000-0000-000000000003';

-- Donor 1 accepts -> request moves open -> responding.
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.respond_to_request((select v::uuid from fx where k = 'response1'), true);
reset role;

select is(
  (select status from public.blood_requests where id = (select v::uuid from fx where k = 'request_id')),
  'responding'::public.request_status,
  'first accept moves the request from open to responding'
);

-- Accept never creates a donation.
select is(
  (select count(*)::int from public.donations),
  0,
  'accepting a request does not create a donations row'
);

-- Donor 1 already has an active commitment elsewhere -> can't accept a second one.
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into fx select 'request2_id', (public.create_blood_request(
  patient_id => (select v::uuid from fx where k = 'patient_id'),
  required_at => now() + interval '5 days',
  treating_centre => 'Test Hospital',
  district_id => 1,
  units_needed => 1
)).id::text;
select public.publish_blood_request((select v::uuid from fx where k = 'request2_id'));
reset role;

insert into fx select 'response1_req2', id::text from public.donor_responses dr
  join fx f on f.k = 'request2_id' and dr.request_id = f.v::uuid
  where dr.donor_id = 'd0000000-0000-0000-0000-000000000002';

select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select public.respond_to_request('%s'::uuid, true)$$, (select v from fx where k = 'response1_req2')),
    'donor_has_active_commitment'
  ),
  'OK',
  'a donor with an active commitment elsewhere cannot accept a second request'
);

-- Donor cannot see a request they declined.
select public.respond_to_request((select v::uuid from fx where k = 'response1_req2'), false, 'busy that day');
select is(
  pg_temp.expect_error(
    format($$select * from public.get_request_for_donor('%s'::uuid)$$, (select v from fx where k = 'request2_id')),
    'not_authorized'
  ),
  'OK',
  'a donor who declined can no longer see that request'
);
reset role;

-- Guardian confirms donor 1's donation on the first request -> completed, fulfilled (1 unit needed).
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

-- Only a manager may confirm — a stranger/donor cannot.
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select public.confirm_donation('%s'::uuid, current_date)$$, (select v from fx where k = 'response1')),
    'not_authorized'
  ),
  'OK',
  'a non-manager cannot confirm a donation'
);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.confirm_donation((select v::uuid from fx where k = 'response1'), current_date);
select is(
  (select status from public.donor_responses where id = (select v::uuid from fx where k = 'response1')),
  'completed'::public.response_status,
  'confirm_donation marks the response completed'
);
select is((select count(*)::int from public.donations), 1, 'confirm_donation creates exactly one donations row');
select is(
  (select status from public.blood_requests where id = (select v::uuid from fx where k = 'request_id')),
  'fulfilled'::public.request_status,
  'the request becomes fulfilled once completed responses meet units_needed'
);
-- Response 2 (still 'invited') is auto-expired on fulfilment.
select is(
  (select status from public.donor_responses where id = (select v::uuid from fx where k = 'response2')),
  'expired'::public.response_status,
  'a remaining invited response is expired when the request is fulfilled'
);
reset role;

-- cancel_blood_request cascades to non-terminal responses.
select set_config('request.jwt.claims', json_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.cancel_blood_request((select v::uuid from fx where k = 'request2_id'), 'no longer needed');
reset role;
select is(
  (select status from public.blood_requests where id = (select v::uuid from fx where k = 'request2_id')),
  'cancelled'::public.request_status,
  'cancel_blood_request sets the request to cancelled'
);

-- Notification params never carry the patient's thalassemia_type or phone.
select ok(
  not exists (
    select 1 from public.notifications
    where params::text ilike '%thalassemia%' or params ? 'phone' or params ? 'thalassemia_type'
  ),
  'no notification params leak thalassemia_type or phone (D9)'
);

select * from finish();
rollback;
