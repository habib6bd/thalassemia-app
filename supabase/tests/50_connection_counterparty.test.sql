-- Phase 1b fix pgTAP: get_connection_parties is visible to either party of a
-- connection even while it's still 'requested' (unlike the full patient
-- card / donor profile / public_profiles view, which stay active/paused-only).
begin;
select plan(3);

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
  ('f0000000-0000-0000-0000-000000000001', 'g@test.local'),
  ('f0000000-0000-0000-0000-000000000002', 'd1@test.local'),
  ('f0000000-0000-0000-0000-000000000003', 'stranger@test.local');

select set_config('request.jwt.claims', json_build_object('sub', 'f0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'invite_code', (public.create_patient(display_name => 'CP Patient', blood_group => 'B_POS', district_id => 1)).invite_code;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'f0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile('B_POS'::public.blood_group);
insert into fx select 'conn', id::text from public.request_connection_by_code((select v from fx where k = 'invite_code'));
reset role;

-- Manager can see the requesting donor's minimal info before approving.
select set_config('request.jwt.claims', json_build_object('sub', 'f0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select donor_display_name from public.get_connection_parties((select v::uuid from fx where k = 'conn'))),
  'Donor',
  'the manager can see the requesting donor''s name while the connection is still requested'
);
reset role;

-- Donor can see which patient they requested.
select set_config('request.jwt.claims', json_build_object('sub', 'f0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select patient_display_name from public.get_connection_parties((select v::uuid from fx where k = 'conn'))),
  'CP Patient',
  'the requesting donor can see the patient''s name while the connection is still requested'
);
reset role;

-- A stranger to the connection gets nothing.
select set_config('request.jwt.claims', json_build_object('sub', 'f0000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    format($$select * from public.get_connection_parties('%s'::uuid)$$, (select v from fx where k = 'conn')),
    'not_authorized'
  ),
  'OK',
  'a stranger to the connection cannot call get_connection_parties'
);
reset role;

select * from finish();
rollback;
