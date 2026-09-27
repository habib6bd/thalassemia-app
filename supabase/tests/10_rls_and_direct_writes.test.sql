-- Phase 1a pgTAP: RLS allow/deny (stranger/donor/manager/admin) and D3's
-- "no direct client writes on stateful tables" guarantee.
begin;
select plan(10);

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

-- Fixtures: a guardian with a patient, a stranger, a connected donor, an admin.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'g1@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'stranger@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'donor1@test.local'),
  ('a0000000-0000-0000-0000-000000000004', 'admin1@test.local');

create temp table fixture_codes (invite_code text);
grant all on fixture_codes to authenticated, anon, service_role;

select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fixture_codes select (public.create_patient(display_name => 'RLS Patient', blood_group => 'B_POS', district_id => 1)).invite_code;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'B_POS');
select public.request_connection_by_code((select invite_code from fixture_codes));
reset role;

reset role;
insert into public.user_roles (user_id, role) values ('a0000000-0000-0000-0000-000000000004', 'admin');

-- Stranger sees nothing about the patient.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is_empty(
  $$select 1 from public.patients where display_name = 'RLS Patient'$$,
  'stranger cannot select the patient row directly'
);
select is_empty(
  $$select 1 from public.patient_cards_for_donor where display_name = 'RLS Patient'$$,
  'stranger sees nothing via patient_cards_for_donor either'
);
reset role;

-- Manager sees the full patient row.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select isnt_empty(
  $$select 1 from public.patients where display_name = 'RLS Patient'$$,
  'manager can select their own patient'
);
reset role;

-- Admin sees the patient too.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
select isnt_empty(
  $$select 1 from public.patients where display_name = 'RLS Patient'$$,
  'admin can select any patient'
);
reset role;

-- Direct client writes on RPC-only ("stateful") tables are always rejected,
-- regardless of who the caller is (D3) — even the patient's own manager.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  pg_temp.expect_error(
    $$update public.patient_donor_connections set status = 'removed' where true$$,
    'permission denied for table patient_donor_connections'
  ),
  'OK',
  'manager cannot directly UPDATE patient_donor_connections'
);
select is(
  pg_temp.expect_error(
    $$update public.blood_requests set status = 'open' where true$$,
    'permission denied for table blood_requests'
  ),
  'OK',
  'manager cannot directly UPDATE blood_requests'
);
select is(
  pg_temp.expect_error(
    $$insert into public.donations (response_id, request_id, patient_id, donor_id, donated_on, verification, confirmed_by)
      values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), current_date, 'guardian_confirmed', auth.uid())$$,
    'permission denied for table donations'
  ),
  'OK',
  'nobody can directly INSERT into donations — only confirm_donation() can'
);
select is(
  pg_temp.expect_error(
    $$update public.patients set display_name = 'hacked' where true$$,
    'permission denied for table patients'
  ),
  'OK',
  'manager cannot directly UPDATE patients (must go through update_patient RPC)'
);
reset role;

-- audit_logs: admin-only select.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select is_empty($$select 1 from public.audit_logs$$, 'non-admin sees no audit_logs rows');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
select isnt_empty($$select 1 from public.audit_logs$$, 'admin sees audit_logs rows');
reset role;

select * from finish();
rollback;
