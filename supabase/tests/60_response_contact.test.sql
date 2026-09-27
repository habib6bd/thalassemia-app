-- Phase 1c pgTAP: contact reveal (§9) — only after accept, only per each
-- side's own share_contact_on_accept consent.
begin;
select plan(5);

create or replace function pg_temp.expect_error(query text, expected text) returns text
language plpgsql as $$
begin
  execute query;
  return 'NO ERROR RAISED';
exception when others then
  return case when sqlerrm = expected then 'OK' else 'WRONG ERROR: ' || sqlerrm end;
end;
$$;

create temp table fx (k text, v text);
grant all on fx to authenticated, anon, service_role;

insert into auth.users (id, email) values
  ('aa000000-0000-0000-0000-000000000001', 'g@test.local'),
  ('aa000000-0000-0000-0000-000000000002', 'd1@test.local');

-- Guardian consents to sharing; patient + request.
select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', '+8801700000001', 1, null, 'bn', true);
insert into fx select 'patient_id', (public.create_patient(display_name => 'Contact Patient', blood_group => 'AB_NEG', district_id => 1)).id::text;
insert into fx select 'invite_code', (select invite_code from public.patients where id = (select v::uuid from fx where k = 'patient_id'));
reset role;

-- Donor does NOT consent to sharing.
select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor', '+8801700000002', 1, null, 'bn', false);
select public.upsert_donor_profile('AB_NEG'::public.blood_group);
insert into fx select 'conn', id::text from public.request_connection_by_code((select v from fx where k = 'invite_code'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.respond_connection((select v::uuid from fx where k = 'conn'), true, 'regular');
insert into fx select 'request_id', (public.create_blood_request(
  patient_id => (select v::uuid from fx where k = 'patient_id'),
  required_at => now() + interval '2 days',
  treating_centre => 'Test Hospital',
  district_id => 1,
  units_needed => 1
)).id::text;
select public.publish_blood_request((select v::uuid from fx where k = 'request_id'));
reset role;

insert into fx select 'response_id', id::text from public.donor_responses
where request_id = (select v::uuid from fx where k = 'request_id');

-- Before accept: not_authorized (invalid_transition, since status is 'invited').
select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select * from public.get_response_contact('%s'::uuid)$$, (select v from fx where k = 'response_id')),
    'invalid_transition'
  ),
  'OK',
  'contact is not revealed before the donor accepts'
);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.respond_to_request((select v::uuid from fx where k = 'response_id'), true);
reset role;

-- After accept: guardian (consented) sees the guardian's own... wait, guardian
-- sees the MANAGER's contact reflected back plus donor's (donor didn't
-- consent, so donor_phone should be null); manager_phone should be set
-- since the guardian (primary manager) consented.
select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select donor_phone from public.get_response_contact((select v::uuid from fx where k = 'response_id'))),
  null,
  'the donor''s phone is withheld since the donor did not consent'
);
select is(
  (select manager_phone from public.get_response_contact((select v::uuid from fx where k = 'response_id'))),
  '+8801700000001',
  'the manager''s phone is revealed since the manager consented'
);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select manager_phone from public.get_response_contact((select v::uuid from fx where k = 'response_id'))),
  '+8801700000001',
  'the donor can also see the consenting manager''s phone'
);
reset role;

-- A stranger cannot call it at all.
insert into auth.users (id, email) values ('aa000000-0000-0000-0000-000000000003', 'stranger@test.local');
select set_config('request.jwt.claims', json_build_object('sub', 'aa000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select * from public.get_response_contact('%s'::uuid)$$, (select v from fx where k = 'response_id')),
    'not_authorized'
  ),
  'OK',
  'a stranger to the response cannot call get_response_contact'
);
reset role;

select * from finish();
rollback;
