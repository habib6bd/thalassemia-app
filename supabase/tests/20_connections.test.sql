-- Phase 1a pgTAP: patient-donor connection state machine (§7.1), the donor
-- limit, and duplicate-connection rejection.
begin;
select plan(9);

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

-- One guardian + patient, one donor.
insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'g@test.local'),
  ('b0000000-0000-0000-0000-000000000002', 'd1@test.local');

select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'invite_code', (public.create_patient(display_name => 'Conn Patient', blood_group => 'O_POS', district_id => 1)).invite_code;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'O_POS');
insert into fx select 'connection_id', id::text from public.request_connection_by_code((select v from fx where k = 'invite_code'));
reset role;

-- Donor cannot respond to their own request (only the non-initiating side can).
select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select public.respond_connection('%s'::uuid, true, 'regular')$$, (select v from fx where k = 'connection_id')),
    'not_authorized'
  ),
  'OK',
  'the initiating donor cannot accept their own connection request'
);
reset role;

-- Guardian (non-initiator) accepts.
select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select status from public.respond_connection((select v::uuid from fx where k = 'connection_id'), true, 'regular')),
  'active'::public.connection_status,
  'guardian accepting a donor-initiated request makes it active'
);

-- Re-accepting an already-active connection is not a valid transition.
select is(
  pg_temp.expect_error(
    format($$select public.respond_connection('%s'::uuid, true, 'regular')$$, (select v from fx where k = 'connection_id')),
    'invalid_transition'
  ),
  'OK',
  'responding to an already-active connection is rejected'
);

-- pause -> active -> removed is valid; active -> requested is not (not exposed, so we check via a bad target).
select is(
  (select status from public.set_connection_status((select v::uuid from fx where k = 'connection_id'), 'paused', null)),
  'paused'::public.connection_status,
  'active -> paused is valid'
);
select is(
  (select status from public.set_connection_status((select v::uuid from fx where k = 'connection_id'), 'active', null)),
  'active'::public.connection_status,
  'paused -> active (resume) is valid'
);
select is(
  (select status from public.set_connection_status((select v::uuid from fx where k = 'connection_id'), 'removed', 'no longer needed')),
  'removed'::public.connection_status,
  'active -> removed is valid'
);
select is(
  pg_temp.expect_error(
    format($$select public.set_connection_status('%s'::uuid, 'active', null)$$, (select v from fx where k = 'connection_id')),
    'invalid_transition'
  ),
  'OK',
  'a removed connection cannot be resumed'
);
reset role;

-- Donor limit: fill up to max_connected_donors (6 by default), 7th fails.
select set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into fx select 'invite_code_2', (public.create_patient(display_name => 'Limit Patient', blood_group => 'O_POS', district_id => 1)).invite_code;
reset role;

do $$
declare
  i int;
  v_donor uuid;
  v_code text;
begin
  select v into v_code from fx where k = 'invite_code_2';
  for i in 1..6 loop
    v_donor := ('c0000000-0000-0000-0000-00000000' || lpad(i::text, 4, '0'))::uuid;
    insert into auth.users (id, email) values (v_donor, 'limit' || i || '@test.local');
    perform set_config('request.jwt.claims', json_build_object('sub', v_donor, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.complete_onboarding(array['donor']::public.app_role[], 'Donor ' || i, null, 1, null, 'bn', false);
    perform public.upsert_donor_profile('O_POS'::public.blood_group);
    perform public.request_connection_by_code(v_code);
    reset role;
  end loop;
end;
$$;

insert into auth.users (id, email) values ('c0000000-0000-0000-0000-000000000007', 'limit7@test.local');
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-000000000007', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor 7', null, 1, null, 'bn', false);
select public.upsert_donor_profile('O_POS'::public.blood_group);
select is(
  pg_temp.expect_error(
    format($$select public.request_connection_by_code('%s')$$, (select v from fx where k = 'invite_code_2')),
    'donor_limit_reached'
  ),
  'OK',
  'a 7th connection request is rejected once max_connected_donors (6) is reached'
);
reset role;

-- Duplicate: donor 1 already has a non-terminal connection to "Limit Patient".
select set_config('request.jwt.claims', json_build_object('sub', 'c0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select public.request_connection_by_code('%s')$$, (select v from fx where k = 'invite_code_2')),
    'connection_already_exists'
  ),
  'OK',
  'a donor cannot request a second connection to a patient they are already connected to'
);
reset role;

select * from finish();
rollback;
