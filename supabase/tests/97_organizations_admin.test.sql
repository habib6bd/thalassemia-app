-- Phase 2d pgTAP: organization directory + verification, re-verification job,
-- patient/request links, admin users & roles, requests overview, settings
-- editor (phase-2.md 2d).
begin;
select plan(48);

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

create or replace function pg_temp.login(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.login(uuid) to authenticated, anon;

create temp table fx (k text primary key, v text);
grant all on fx to authenticated, anon, service_role;
create or replace function pg_temp.fx(key text) returns uuid
language sql stable as $$ select v::uuid from fx where k = key $$;
grant execute on function pg_temp.fx(text) to authenticated, anon;

-- d7..01 admin  02 guardian (manages P)  03 stranger
insert into auth.users (id, email) values
  ('d7000000-0000-0000-0000-000000000001', 'admin@org.local'),
  ('d7000000-0000-0000-0000-000000000002', 'guardian@org.local'),
  ('d7000000-0000-0000-0000-000000000003', 'stranger@org.local');
insert into fx values
  ('admin', 'd7000000-0000-0000-0000-000000000001'),
  ('guardian', 'd7000000-0000-0000-0000-000000000002'),
  ('stranger', 'd7000000-0000-0000-0000-000000000003');

set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Admin', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('guardian'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'p', (public.create_patient(display_name => 'Patient P', blood_group => 'A_POS', district_id => 1)).id::text;
select pg_temp.login(pg_temp.fx('stranger'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Stranger', null, 1, null, 'bn', false);

reset role;
select is((select count(*)::int from public.organizations), 0, 'no organization is seeded');
insert into public.user_roles (user_id, role) values (pg_temp.fx('admin'), 'admin');
set local role authenticated;

-- ===== Organizations: create / edit =====
select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error($$select public.admin_upsert_organization(null, 'X', 'hospital', 1)$$, 'not_authorized'),
  'OK', 'a non-admin cannot add an organization');
select throws_ok(
  $$insert into public.organizations (name, type, district_id) values ('X', 'hospital', 1)$$,
  '42501', null, 'organizations cannot be inserted directly');

select pg_temp.login(pg_temp.fx('admin'));
insert into fx select 'org', (public.admin_upsert_organization(
  null, '  Test Centre  ', 'treatment_centre', 1, phone => '+8801700000000', website => 'https://example.org')).id::text;
select is((select name from public.admin_list_organizations() where id = pg_temp.fx('org')), 'Test Centre',
  'an admin can add an organization (trimmed)');
select is((select verification_status::text from public.admin_list_organizations() where id = pg_temp.fx('org')), 'pending',
  'a new organization starts as pending');
select is(
  pg_temp.expect_error($$select public.admin_upsert_organization(null, 'Bad', 'hospital', 1, website => 'not a url')$$, 'invalid_organization'),
  'OK', 'an invalid website is rejected');
select is(
  pg_temp.expect_error($$select public.admin_upsert_organization(null, 'Bad', 'hospital', 1, latitude => 23.7)$$, 'invalid_organization'),
  'OK', 'latitude without longitude is rejected');
select lives_ok(format($$select public.admin_upsert_organization('%s', 'Test Centre', 'treatment_centre', 1, services => 'Transfusion')$$, pg_temp.fx('org')),
  'an admin can edit an organization');

select pg_temp.login(pg_temp.fx('guardian'));
select is((select count(*)::int from public.organizations), 0, 'users do not see pending organizations');
select is(
  pg_temp.expect_error($$select * from public.admin_list_organizations()$$, 'not_authorized'),
  'OK', 'users cannot list all organizations');
select throws_ok(
  $$select verification_note from public.organizations$$,
  '42501', null, 'users cannot read verification notes');
select is(
  pg_temp.expect_error(format($$select public.set_patient_organization('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('org')), 'organization_not_verified'),
  'OK', 'a pending organization cannot be linked to a patient');

-- ===== Verification =====
select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error(format($$select public.admin_set_organization_verification('%s', 'verified', 'phone_call')$$, pg_temp.fx('org')), 'not_authorized'),
  'OK', 'a non-admin cannot verify');

select pg_temp.login(pg_temp.fx('admin'));
select is(
  pg_temp.expect_error(format($$select public.admin_set_organization_verification('%s', 'verified')$$, pg_temp.fx('org')), 'verification_method_required'),
  'OK', 'verifying requires a method');
select is(
  pg_temp.expect_error(format($$select public.admin_set_organization_verification('%s', 'stale')$$, pg_temp.fx('org')), 'invalid_transition'),
  'OK', 'stale is set by the job only');
select lives_ok(format($$select public.admin_set_organization_verification('%s', 'verified', 'phone_call', 'called the front desk')$$, pg_temp.fx('org')),
  'an admin can verify an organization');
select ok((select last_verified_at is not null and verified_by = pg_temp.fx('admin')
           from public.admin_list_organizations() where id = pg_temp.fx('org')),
  'verification records who and when');
select is((select count(*)::int from public.organization_verifications where organization_id = pg_temp.fx('org')), 1,
  'verification history is recorded');

select pg_temp.login(pg_temp.fx('guardian'));
select is((select count(*)::int from public.organizations), 1, 'users see verified organizations');
select isnt((select last_verified_at from public.organizations where id = pg_temp.fx('org')), null,
  'users see the last verified date');
select is((select count(*)::int from public.organization_verifications), 0, 'users cannot read verification history');

-- ===== Links =====
select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error(format($$select public.set_patient_organization('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('org')), 'not_authorized'),
  'OK', 'a stranger cannot link a patient to an organization');

select pg_temp.login(pg_temp.fx('guardian'));
select lives_ok(format($$select public.set_patient_organization('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('org')),
  'a manager can link the patient to a verified organization');
insert into fx select 'r', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '1 day',
  treating_centre => 'Test Centre', district_id => 1)).id::text;
select is((select organization_id from public.blood_requests where id = pg_temp.fx('r')), pg_temp.fx('org'),
  'a new request inherits the patient''s organization');
select lives_ok(format($$select public.set_request_organization('%s', null)$$, pg_temp.fx('r')),
  'a manager can clear the request''s organization');
select is((select organization_id from public.blood_requests where id = pg_temp.fx('r')), null,
  'the link is cleared (free text stays)');

select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error(format($$select public.set_request_organization('%s', '%s')$$, pg_temp.fx('r'), pg_temp.fx('org')), 'not_authorized'),
  'OK', 'a stranger cannot link a request');

-- ===== Re-verification job =====
reset role;
update public.organizations set last_verified_at = now() - interval '11 months 15 days' where id = pg_temp.fx('org');
select public.process_organization_reverification();
select is((select verification_status::text from public.organizations where id = pg_temp.fx('org')), 'verified',
  'an entry inside the window stays verified');
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('admin') and type = 'organization_reverification_due'), 1,
  'admins get a re-verification reminder before the entry goes stale');
select public.process_organization_reverification();
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('admin') and type = 'organization_reverification_due'), 1,
  'the reminder is sent only once');

update public.organizations set last_verified_at = now() - interval '13 months' where id = pg_temp.fx('org');
select public.process_organization_reverification();
select is((select verification_status::text from public.organizations where id = pg_temp.fx('org')), 'stale',
  'an overdue entry is marked stale');
select ok(exists (select 1 from cron.job where jobname = 'process-organization-reverification'),
  'the re-verification job is scheduled');
set local role authenticated;

select pg_temp.login(pg_temp.fx('guardian'));
select is((select count(*)::int from public.organizations), 0, 'stale entries are hidden from users');

-- ===== Users & roles =====
select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error($$select * from public.admin_search_users()$$, 'not_authorized'),
  'OK', 'a non-admin cannot search users');
select is(
  pg_temp.expect_error(format($$select public.admin_set_user_role('%s', 'admin', true)$$, pg_temp.fx('stranger')), 'not_authorized'),
  'OK', 'a non-admin cannot grant roles');

select pg_temp.login(pg_temp.fx('admin'));
select is((select email from public.admin_search_users('guardian@')), 'guardian@org.local', 'an admin can search users by email');
select is(
  pg_temp.expect_error(format($$select public.admin_set_user_role('%s', 'donor', true)$$, pg_temp.fx('stranger')), 'role_not_admin_managed'),
  'OK', 'self-assigned roles are not managed by admins');
select lives_ok(format($$select public.admin_set_user_role('%s', 'organization', true)$$, pg_temp.fx('stranger')),
  'an admin can grant the organization role');
select ok((select 'organization' = any(roles) from public.admin_search_users('Stranger')), 'the role is granted');
select is(
  pg_temp.expect_error(format($$select public.admin_set_user_role('%s', 'admin', false)$$, pg_temp.fx('admin')), 'cannot_remove_own_admin'),
  'OK', 'an admin cannot remove their own admin role');

-- ===== Requests overview =====
select is((public.admin_request_overview() ->> 'created_last_7_days')::int, 1, 'the overview counts requests');
select ok(not (public.admin_request_overview() ? 'patients'), 'the overview holds aggregates only');
select pg_temp.login(pg_temp.fx('guardian'));
select is(
  pg_temp.expect_error($$select public.admin_request_overview()$$, 'not_authorized'),
  'OK', 'a non-admin cannot read the overview');

-- ===== Settings editor =====
select is(
  pg_temp.expect_error($$select public.admin_update_setting('max_connected_donors', '8')$$, 'not_authorized'),
  'OK', 'a non-admin cannot change settings');
select pg_temp.login(pg_temp.fx('admin'));
select is(
  pg_temp.expect_error($$select public.admin_update_setting('max_connected_donors', '0')$$, 'invalid_setting_value'),
  'OK', 'a setting must be a whole number of at least 1');
select is(
  pg_temp.expect_error($$select public.admin_update_setting('unknown_key', '3')$$, 'not_found'),
  'OK', 'unknown settings cannot be created');
select lives_ok($$select public.admin_update_setting('max_connected_donors', '8')$$, 'an admin can change a setting');
reset role;
select ok(exists (
  select 1 from public.audit_logs where table_name = 'app_settings' and actor_id = pg_temp.fx('admin')
), 'setting changes are audited');

select * from finish();
rollback;
