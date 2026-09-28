-- Phase 4b pgTAP: organization staff membership, portal visibility and
-- org_verified donation confirmation (phase-3-4.md 4b).
begin;
select plan(25);

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
create or replace function pg_temp.fxt(key text) returns text
language sql stable as $$ select v from fx where k = key $$;
grant execute on function pg_temp.fxt(text) to authenticated, anon;

-- b4..01 admin 02 staff 03 guardian 04 donor 05 other staff (other org)
insert into auth.users (id, email) values
  ('b4000000-0000-0000-0000-000000000001', 'admin@org4.local'),
  ('b4000000-0000-0000-0000-000000000002', 'staff@org4.local'),
  ('b4000000-0000-0000-0000-000000000003', 'guardian@org4.local'),
  ('b4000000-0000-0000-0000-000000000004', 'donor@org4.local'),
  ('b4000000-0000-0000-0000-000000000005', 'other@org4.local');
insert into fx values
  ('admin', 'b4000000-0000-0000-0000-000000000001'),
  ('staff', 'b4000000-0000-0000-0000-000000000002'),
  ('guardian', 'b4000000-0000-0000-0000-000000000003'),
  ('donor', 'b4000000-0000-0000-0000-000000000004'),
  ('other', 'b4000000-0000-0000-0000-000000000005');

set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Admin', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('staff'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Staff', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('other'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Other Staff', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('guardian'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'p', (public.create_patient(display_name => 'Patient Q', blood_group => 'B_NEG', district_id => 1, thalassemia_type => 'beta')).id::text;
insert into fx select 'pcode', invite_code from public.patients where id = pg_temp.fx('p');
select pg_temp.login(pg_temp.fx('donor'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor Q', '+8801700000044', 1, null, 'bn', true);
select public.upsert_donor_profile(blood_group => 'B_NEG');
insert into fx select 'conn', id::text from public.request_connection_by_code(pg_temp.fxt('pcode'));
select pg_temp.login(pg_temp.fx('guardian'));
select public.respond_connection(pg_temp.fx('conn'), true);

reset role;
insert into public.user_roles (user_id, role) values (pg_temp.fx('admin'), 'admin');
set local role authenticated;

select pg_temp.login(pg_temp.fx('admin'));
insert into fx select 'org', (public.admin_upsert_organization(null, 'Centre A', 'treatment_centre', 1)).id::text;
insert into fx select 'org2', (public.admin_upsert_organization(null, 'Centre B', 'hospital', 1)).id::text;
select public.admin_set_organization_verification(pg_temp.fx('org'), 'verified', 'phone_call');
select public.admin_set_organization_verification(pg_temp.fx('org2'), 'verified', 'phone_call');

-- ===== Membership =====
select pg_temp.login(pg_temp.fx('staff'));
select is(pg_temp.expect_error(format($$select public.admin_set_organization_member('%s', '%s', true)$$, pg_temp.fx('org'), pg_temp.fx('staff')), 'not_authorized'), 'OK',
  'a user cannot add themselves to an organization');

select pg_temp.login(pg_temp.fx('admin'));
select lives_ok(format($$select public.admin_set_organization_member('%s', '%s', true)$$, pg_temp.fx('org'), pg_temp.fx('staff')),
  'an admin can add staff');
select public.admin_set_organization_member(pg_temp.fx('org2'), pg_temp.fx('other'), true);
select is((select count(*)::int from public.admin_list_organization_members(pg_temp.fx('org'))), 1, 'admins list members');

select pg_temp.login(pg_temp.fx('staff'));
select ok(public.has_role('organization'), 'adding staff grants the organization role');
select is((select count(*)::int from public.org_my_organizations() where can_act), 1, 'staff see their organization');
select is((select count(*)::int from public.notifications where type = 'organization_member_added'), 1, 'staff are notified');
select is((select count(*)::int from public.organization_members), 1, 'staff see only their own memberships');
select is(pg_temp.expect_error(format($$select * from public.admin_list_organization_members('%s')$$, pg_temp.fx('org')), 'not_authorized'), 'OK',
  'staff cannot list members');

-- ===== A request linked to the organization =====
select pg_temp.login(pg_temp.fx('guardian'));
select public.set_patient_organization(pg_temp.fx('p'), pg_temp.fx('org'));
insert into fx select 'r', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '1 day',
  treating_centre => 'Centre A', district_id => 1, notes => 'private note')).id::text;
select public.publish_blood_request(pg_temp.fx('r'));
select pg_temp.login(pg_temp.fx('donor'));
insert into fx select 'resp', id::text from public.donor_responses where request_id = pg_temp.fx('r');
select public.respond_to_request(pg_temp.fx('resp'), true);

select pg_temp.login(pg_temp.fx('staff'));
select is((select patient_display_name from public.org_list_requests(pg_temp.fx('org'))), 'Patient Q',
  'staff see requests linked to their organization');
select is((select accepted_count from public.org_list_requests(pg_temp.fx('org'))), 1, 'with the number of donors who can donate');
select ok(position('beta' in (select row_to_json(r)::text from public.org_list_requests(pg_temp.fx('org')) r)) = 0
      and position('private note' in (select row_to_json(r)::text from public.org_list_requests(pg_temp.fx('org')) r)) = 0,
  'staff never see thalassemia type or notes');
select is((select donor_display_name from public.org_list_request_responses(pg_temp.fx('r'))), 'Donor Q',
  'staff see the donor''s display name');
select ok(position('+880' in (select row_to_json(r)::text from public.org_list_request_responses(pg_temp.fx('r')) r)) = 0,
  'staff never see phone numbers');
select is((select count(*)::int from public.blood_requests), 0, 'staff cannot read requests directly');

select pg_temp.login(pg_temp.fx('other'));
select is(pg_temp.expect_error(format($$select * from public.org_list_requests('%s')$$, pg_temp.fx('org')), 'not_authorized'), 'OK',
  'staff of another organization cannot see these requests');
select is(pg_temp.expect_error(format($$select * from public.org_list_request_responses('%s')$$, pg_temp.fx('r')), 'not_authorized'), 'OK',
  'or their responses');
select is(pg_temp.expect_error(format($$select public.org_confirm_donation('%s', current_date)$$, pg_temp.fx('resp')), 'not_authorized'), 'OK',
  'or confirm their donations');

select pg_temp.login(pg_temp.fx('guardian'));
select is(pg_temp.expect_error(format($$select public.org_confirm_donation('%s', current_date)$$, pg_temp.fx('resp')), 'not_authorized'), 'OK',
  'a guardian cannot record an organization-verified donation');

-- ===== Confirm =====
select pg_temp.login(pg_temp.fx('staff'));
select is(pg_temp.expect_error(format($$select public.org_confirm_donation('%s', current_date + 2)$$, pg_temp.fx('resp')), 'invalid_donation_date'), 'OK',
  'a donation date in the future is rejected');
select is((select verification::text from public.org_confirm_donation(pg_temp.fx('resp'), current_date)), 'org_verified',
  'staff confirm a donation as org_verified');
select is(pg_temp.expect_error(format($$select public.org_confirm_donation('%s', current_date)$$, pg_temp.fx('resp')), 'invalid_transition'), 'OK',
  'a donation is confirmed only once');

select pg_temp.login(pg_temp.fx('guardian'));
select is((select status::text from public.blood_requests where id = pg_temp.fx('r')), 'fulfilled', 'the request is fulfilled');
select is((select count(*)::int from public.notifications where type = 'donation_confirmed'), 1, 'the patient''s managers are told');

-- ===== Suspended organization / removal =====
select pg_temp.login(pg_temp.fx('admin'));
select public.admin_set_organization_verification(pg_temp.fx('org'), 'pending', null, 're-checking');
select pg_temp.login(pg_temp.fx('staff'));
select is(pg_temp.expect_error(format($$select * from public.org_list_requests('%s')$$, pg_temp.fx('org')), 'not_authorized'), 'OK',
  'staff of an organization that is no longer verified cannot act');

select pg_temp.login(pg_temp.fx('admin'));
select public.admin_set_organization_member(pg_temp.fx('org'), pg_temp.fx('staff'), false);
select pg_temp.login(pg_temp.fx('staff'));
select ok(not public.has_role('organization'), 'removing the last membership removes the organization role');

select * from finish();
rollback;
