-- Phase 4c pgTAP: opt-in approximate donor location, nearby search (bands
-- only, gated like broad search), blocks in broad eligibility, and daily
-- availability / transfusion reminders (phase-3-4.md 4c).
begin;
select plan(23);

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

-- c4..01 admin 02 guardian 03 near donor (other division) 04 far donor
-- 05 connected donor (reminders) 06 blocked donor (same district)
insert into auth.users (id, email) values
  ('c4000000-0000-0000-0000-000000000001', 'admin@near.local'),
  ('c4000000-0000-0000-0000-000000000002', 'guardian@near.local'),
  ('c4000000-0000-0000-0000-000000000003', 'near@near.local'),
  ('c4000000-0000-0000-0000-000000000004', 'far@near.local'),
  ('c4000000-0000-0000-0000-000000000005', 'reg@near.local'),
  ('c4000000-0000-0000-0000-000000000006', 'blocked@near.local');
insert into fx values
  ('admin', 'c4000000-0000-0000-0000-000000000001'),
  ('guardian', 'c4000000-0000-0000-0000-000000000002'),
  ('near', 'c4000000-0000-0000-0000-000000000003'),
  ('far', 'c4000000-0000-0000-0000-000000000004'),
  ('reg', 'c4000000-0000-0000-0000-000000000005'),
  ('blocked', 'c4000000-0000-0000-0000-000000000006');

-- A district in another division than district 1, for the "nearby across a border" case.
create temp table other_district as
  select d.id from public.districts d
  where d.division_id <> (select division_id from public.districts where id = 1)
  order by d.id limit 1;
grant select on other_district to authenticated;

set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Admin', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('guardian'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'p', (public.create_patient(display_name => 'Patient N', blood_group => 'A_NEG', district_id => 1)).id::text;

select pg_temp.login(pg_temp.fx('near'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Near Donor', null, (select id from other_district), null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'A_NEG', searchable => true);
select pg_temp.login(pg_temp.fx('far'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Far Donor', null, (select id from other_district), null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'A_NEG', searchable => true);
select pg_temp.login(pg_temp.fx('blocked'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Blocked Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'A_NEG', searchable => true);
select public.block_user(pg_temp.fx('guardian'));
select pg_temp.login(pg_temp.fx('reg'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Regular', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'O_POS');

-- ===== Location =====
select pg_temp.login(pg_temp.fx('guardian'));
select is(pg_temp.expect_error($$select public.set_donor_location(23.8, 90.4)$$, 'donor_profile_required'), 'OK',
  'only donors can share a location');

select pg_temp.login(pg_temp.fx('near'));
select public.set_donor_location(23.81234, 90.41234);
select is((select latitude::text || ',' || longitude::text from public.donor_locations), '23.81,90.41',
  'the shared point is rounded to about 1 km');
select is(pg_temp.expect_error($$select public.set_donor_location(123, 90)$$, 'invalid_location'), 'OK',
  'an impossible point is rejected');
select throws_ok($$insert into public.donor_locations (user_id, latitude, longitude) values (auth.uid(), 1, 1)$$,
  '42501', null, 'locations cannot be written directly');
select pg_temp.login(pg_temp.fx('far'));
select public.set_donor_location(22.30, 91.80);
select pg_temp.login(pg_temp.fx('blocked'));
select public.set_donor_location(23.80, 90.40);

select pg_temp.login(pg_temp.fx('guardian'));
select is((select count(*)::int from public.donor_locations), 0, 'nobody else can read donor locations');

-- ===== Request at a verified organization with coordinates =====
reset role;
insert into public.user_roles (user_id, role) values (pg_temp.fx('admin'), 'admin');
set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
insert into fx select 'org', (public.admin_upsert_organization(null, 'Centre N', 'treatment_centre', 1, latitude => 23.80, longitude => 90.40)).id::text;
select public.admin_set_organization_verification(pg_temp.fx('org'), 'verified', 'phone_call');

select pg_temp.login(pg_temp.fx('guardian'));
select public.set_patient_organization(pg_temp.fx('p'), pg_temp.fx('org'));
insert into fx select 'r', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '10 days',
  treating_centre => 'Centre N', district_id => 1)).id::text;
insert into fx select 'r2', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '12 days',
  treating_centre => 'Somewhere', district_id => 1)).id::text;
select public.set_request_organization(pg_temp.fx('r2'), null);
select public.publish_blood_request(pg_temp.fx('r'));
select public.publish_blood_request(pg_temp.fx('r2'));

select is(pg_temp.expect_error(format($$select * from public.search_nearby_donors('%s')$$, pg_temp.fx('r')), 'search_not_available_yet'), 'OK',
  'nearby search is gated like broad search');

reset role;
update public.blood_requests set current_tier = 'broad' where id in (pg_temp.fx('r'), pg_temp.fx('r2'));
set local role authenticated;

select pg_temp.login(pg_temp.fx('guardian'));
select is((select count(*)::int from public.search_nearby_donors(pg_temp.fx('r'), 25)), 1,
  'nearby search finds opted-in donors within the radius only');
select is((select display_name || ':' || distance_band from public.search_nearby_donors(pg_temp.fx('r'), 25)), 'Near Donor:under_5',
  'results show a distance band');
select ok(position('23.8' in (select coalesce(string_agg(row_to_json(x)::text, ''), '') from public.search_nearby_donors(pg_temp.fx('r'), 50) x)) = 0,
  'results never include coordinates');
select is((select count(*)::int from public.search_nearby_donors(pg_temp.fx('r'), 5000)), 1,
  'the radius is capped at nearby_search_max_km');
select is(pg_temp.expect_error(format($$select * from public.search_nearby_donors('%s')$$, pg_temp.fx('r2')), 'request_location_unknown'), 'OK',
  'requests without a located organization cannot use nearby search');
select is((select count(*)::int from public.search_broad_donors(pg_temp.fx('r'), false) where display_name = 'Blocked Donor'), 0,
  'a donor who blocked the manager is not offered in broad search');
select is(pg_temp.expect_error(format($$select public.invite_broad_donor('%s', '%s')$$, pg_temp.fx('r'), pg_temp.fx('blocked')), 'donor_not_available'), 'OK',
  'nor can they be invited');
select lives_ok(format($$select public.invite_broad_donor('%s', '%s')$$, pg_temp.fx('r'), pg_temp.fx('near')),
  'a nearby donor from another division can be invited');

select pg_temp.login(pg_temp.fx('near'));
select is((select count(*)::int from public.donor_responses where request_id = pg_temp.fx('r')), 1, 'the nearby donor receives the invitation');
select public.set_donor_location(null, null);
select is((select count(*)::int from public.donor_locations), 0, 'a donor can stop sharing their location');

select pg_temp.login(pg_temp.fx('admin'));
select is(pg_temp.expect_error(format($$select * from public.search_nearby_donors('%s')$$, pg_temp.fx('r')), 'not_authorized'), 'OK',
  'non-managers cannot search');

-- ===== Reminders =====
reset role;
update public.donor_profiles set last_donation_date = current_date - 130 where user_id = pg_temp.fx('reg');
update public.donor_profiles set availability = 'unavailable', available_from = current_date - 1 where user_id = pg_temp.fx('far');
update public.donor_profiles set availability_reminders = false, last_donation_date = current_date - 300 where user_id = pg_temp.fx('blocked');
update public.patients set next_transfusion_date = current_date + 2 where id = pg_temp.fx('p');
select public.process_daily_reminders();
select public.process_daily_reminders();

select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('reg') and type = 'availability_check_in'), 1,
  'a donor gets one check-in after donation_reminder_days');
select is((select params ->> 'reason' from public.notifications where user_id = pg_temp.fx('far') and type = 'availability_check_in'), 'available_from_reached',
  'a donor is reminded when their own "available from" date arrives');
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('blocked') and type = 'availability_check_in'), 0,
  'donors can turn check-ins off');
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('guardian') and type = 'transfusion_upcoming'), 1,
  'managers are reminded once before the next transfusion date');

update public.app_settings set value = '12' where key = 'transfusion_reminder_days';
update public.patients set next_transfusion_date = public.bd_date(now() + interval '10 days'), transfusion_reminded_for = null where id = pg_temp.fx('p');
select public.process_daily_reminders();
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('guardian') and type = 'transfusion_upcoming'), 1,
  'no reminder when a request already covers the transfusion date');
select ok(exists (select 1 from cron.job where jobname = 'process-daily-reminders'), 'the reminder job is scheduled');

select * from finish();
rollback;
