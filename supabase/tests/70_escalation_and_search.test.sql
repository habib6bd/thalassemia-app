-- Phase 2a pgTAP: tiered invitations, escalation timing (Q17), widen search,
-- broad search privacy (§9, Q19), broad invites, emergency publish (Q18),
-- and patient-side connection requests (§7.1).
begin;
select plan(34);

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

-- e7..01 guardian (manager)  02 regular donor  03 backup donor
-- 04 searchable  05 not searchable  06 emergency-only  07 searchable, other
-- blood group  08 searchable, other district in the same division
-- 09 unrelated guardian
insert into auth.users (id, email) values
  ('e7000000-0000-0000-0000-000000000001', 'g@t.local'),
  ('e7000000-0000-0000-0000-000000000002', 'reg@t.local'),
  ('e7000000-0000-0000-0000-000000000003', 'bak@t.local'),
  ('e7000000-0000-0000-0000-000000000004', 'srch@t.local'),
  ('e7000000-0000-0000-0000-000000000005', 'hidden@t.local'),
  ('e7000000-0000-0000-0000-000000000006', 'emerg@t.local'),
  ('e7000000-0000-0000-0000-000000000007', 'other-group@t.local'),
  ('e7000000-0000-0000-0000-000000000008', 'other-district@t.local'),
  ('e7000000-0000-0000-0000-000000000009', 'stranger@t.local');

insert into fx values
  ('g', 'e7000000-0000-0000-0000-000000000001'),
  ('reg', 'e7000000-0000-0000-0000-000000000002'),
  ('bak', 'e7000000-0000-0000-0000-000000000003'),
  ('srch', 'e7000000-0000-0000-0000-000000000004'),
  ('hidden', 'e7000000-0000-0000-0000-000000000005'),
  ('emerg', 'e7000000-0000-0000-0000-000000000006'),
  ('og', 'e7000000-0000-0000-0000-000000000007'),
  ('od', 'e7000000-0000-0000-0000-000000000008'),
  ('stranger', 'e7000000-0000-0000-0000-000000000009');

set local role authenticated;

select pg_temp.login(pg_temp.fx('g'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'patient', (public.create_patient(display_name => 'Secret Patient', blood_group => 'AB_POS', district_id => 1)).id::text;
insert into fx select 'code', invite_code from public.patients where id = pg_temp.fx('patient');

select pg_temp.login(pg_temp.fx('stranger'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Stranger', null, 1, null, 'bn', false);

-- Connected donors: regular + backup.
select pg_temp.login(pg_temp.fx('reg'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Regular Donor', '+8801711111111', 1, 'Mirpur', 'bn', true);
select public.upsert_donor_profile(blood_group => 'AB_POS');
insert into fx select 'conn_reg', id::text from public.request_connection_by_code((select v from fx where k = 'code'));

select pg_temp.login(pg_temp.fx('bak'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Backup Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'AB_POS');
insert into fx select 'conn_bak', id::text from public.request_connection_by_code((select v from fx where k = 'code'));

-- Donors outside the network.
select pg_temp.login(pg_temp.fx('srch'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Searchable Donor', '+8801722222222', 1, 'Dhanmondi', 'bn', true);
select public.upsert_donor_profile(blood_group => 'AB_POS', searchable => true);

select pg_temp.login(pg_temp.fx('hidden'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Hidden Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'AB_POS', searchable => false);

select pg_temp.login(pg_temp.fx('emerg'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Emergency Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'AB_POS', emergency_available => true, searchable => false);

select pg_temp.login(pg_temp.fx('og'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Other Group', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'O_POS', searchable => true);

select pg_temp.login(pg_temp.fx('od'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Other District', null, 2, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'AB_POS', searchable => true);

select pg_temp.login(pg_temp.fx('g'));
select public.respond_connection(pg_temp.fx('conn_reg'), true, 'regular');
select public.respond_connection(pg_temp.fx('conn_bak'), true, 'backup');

-- ===== R1: normal request, escalation by timer =====
insert into fx select 'r1', (public.create_blood_request(
  patient_id => pg_temp.fx('patient'), required_at => now() + interval '2 days',
  treating_centre => 'Centre', district_id => 1, units_needed => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('r1'));

select set_eq(
  $$select donor_id from public.donor_responses where request_id = pg_temp.fx('r1')$$,
  array[pg_temp.fx('reg')],
  'publish invites regular-tier connections only'
);
select is((select current_tier::text from public.blood_requests where id = pg_temp.fx('r1')), 'regular', 'a normal request starts at the regular tier');

select is(
  pg_temp.expect_error(format($$select public.widen_request_search('%s')$$, pg_temp.fx('r1')), 'search_not_available_yet'),
  'OK', 'search cannot be widened while regular donors still have time'
);
select is(
  pg_temp.expect_error(format($$select * from public.search_broad_donors('%s')$$, pg_temp.fx('r1')), 'search_not_available_yet'),
  'OK', 'broad search is unavailable before the request reaches the broad tier'
);

reset role;
select public.process_request_timers();
select is((select current_tier::text from public.blood_requests where id = pg_temp.fx('r1')), 'regular',
  'no escalation inside the window while a regular invite is unanswered');

update public.blood_requests set published_at = now() - interval '7 hours' where id = pg_temp.fx('r1');
select public.process_request_timers();
select is((select current_tier::text from public.blood_requests where id = pg_temp.fx('r1')), 'backup',
  'escalates to backup once the regular window has passed');
select is(
  (select invited_via::text from public.donor_responses where request_id = pg_temp.fx('r1') and donor_id = pg_temp.fx('bak')),
  'backup', 'escalation invites backup-tier connections'
);
select is(
  (select count(*)::int from public.notifications where user_id = pg_temp.fx('g') and type = 'request_escalated' and entity_id = pg_temp.fx('r1')),
  1, 'managers are told the request escalated'
);

set local role authenticated;
select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error(format($$select public.widen_request_search('%s')$$, pg_temp.fx('r1')), 'not_authorized'),
  'OK', 'a non-manager cannot widen the search'
);
select is(
  pg_temp.expect_error(format($$select * from public.search_broad_donors('%s')$$, pg_temp.fx('r1')), 'not_authorized'),
  'OK', 'a non-manager cannot run a broad search'
);

select pg_temp.login(pg_temp.fx('g'));
select is((public.widen_request_search(pg_temp.fx('r1'))).current_tier::text, 'broad', 'a manager can widen from backup to broad');

select set_eq(
  format($$select donor_id from public.search_broad_donors('%s')$$, pg_temp.fx('r1')),
  array[pg_temp.fx('srch')],
  'search returns only opted-in, same-group, available donors in the district who are not already invited'
);
select set_eq(
  format($$select donor_id from public.search_broad_donors('%s', true)$$, pg_temp.fx('r1')),
  array[pg_temp.fx('srch'), pg_temp.fx('od')],
  'widening to the division adds donors from other districts in it'
);
select is(
  (select proargnames from pg_proc where proname = 'search_broad_donors'),
  array['request_id', 'include_division', 'donor_id', 'display_name', 'area', 'district_id', 'activity'],
  'search returns no contact or donation-history columns'
);

select is(
  pg_temp.expect_error(format($$select public.invite_broad_donor('%s', '%s')$$, pg_temp.fx('r1'), pg_temp.fx('hidden')), 'donor_not_available'),
  'OK', 'a donor who did not opt in to search cannot be invited from outside the network'
);
select is(
  (public.invite_broad_donor(pg_temp.fx('r1'), pg_temp.fx('srch'))).invited_via::text,
  'broad', 'a manager can invite a donor found by search'
);
select is(
  pg_temp.expect_error(format($$select public.invite_broad_donor('%s', '%s')$$, pg_temp.fx('r1'), pg_temp.fx('srch')), 'already_invited'),
  'OK', 'the same donor cannot be invited twice'
);
select is(
  (select count(*)::int from public.public_profiles where user_id = pg_temp.fx('srch')),
  1, 'the manager can see the invited donor''s display name'
);

select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error(format($$select public.invite_broad_donor('%s', '%s')$$, pg_temp.fx('r1'), pg_temp.fx('od')), 'not_authorized'),
  'OK', 'a non-manager cannot invite donors to someone else''s request'
);

select pg_temp.login(pg_temp.fx('srch'));
select is(
  (select patient_display_name from public.get_request_for_donor(pg_temp.fx('r1'))),
  null, 'an invited donor from outside the network does not see the patient''s name'
);
select is(
  (select count(*)::int from public.blood_requests where id = pg_temp.fx('r1')),
  0, 'the invited donor cannot read the full request row'
);

select pg_temp.login(pg_temp.fx('hidden'));
select is(
  pg_temp.expect_error(format($$select * from public.get_request_for_donor('%s')$$, pg_temp.fx('r1')), 'not_authorized'),
  'OK', 'a donor who was not invited sees nothing about the request'
);

-- ===== R2: early escalation when every regular invite is declined =====
select pg_temp.login(pg_temp.fx('g'));
insert into fx select 'r2', (public.create_blood_request(
  patient_id => pg_temp.fx('patient'), required_at => now() + interval '3 days',
  treating_centre => 'Centre', district_id => 1, units_needed => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('r2'));
select pg_temp.login(pg_temp.fx('reg'));
select public.respond_to_request(
  (select id from public.donor_responses where request_id = pg_temp.fx('r2') and donor_id = pg_temp.fx('reg')), false);
reset role;
select public.process_request_timers();
select is((select current_tier::text from public.blood_requests where id = pg_temp.fx('r2')), 'backup',
  'escalates early when no regular invite is left unanswered');

-- ===== R3: enough donors accepted -> no escalation =====
set local role authenticated;
select pg_temp.login(pg_temp.fx('g'));
insert into fx select 'r3', (public.create_blood_request(
  patient_id => pg_temp.fx('patient'), required_at => now() + interval '4 days',
  treating_centre => 'Centre', district_id => 1, units_needed => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('r3'));
select pg_temp.login(pg_temp.fx('reg'));
select public.respond_to_request(
  (select id from public.donor_responses where request_id = pg_temp.fx('r3') and donor_id = pg_temp.fx('reg')), true);
reset role;
update public.blood_requests set published_at = now() - interval '7 hours' where id = pg_temp.fx('r3');
select public.process_request_timers();
select is((select current_tier::text from public.blood_requests where id = pg_temp.fx('r3')), 'regular',
  'no escalation once enough donors have accepted');

-- ===== R4 / R5: emergency =====
set local role authenticated;
select pg_temp.login(pg_temp.fx('g'));
insert into fx select 'r4', (public.create_blood_request(
  patient_id => pg_temp.fx('patient'), required_at => now() + interval '5 days',
  treating_centre => 'Centre', district_id => 1, units_needed => 1, is_emergency => true)).id::text;
select is(
  pg_temp.expect_error(format($$select public.publish_blood_request('%s')$$, pg_temp.fx('r4')), 'emergency_disclaimer_required'),
  'OK', 'an emergency request cannot be published without acknowledging the notice'
);
select public.publish_blood_request(pg_temp.fx('r4'), emergency_acknowledged => true);
select set_eq(
  $$select donor_id from public.donor_responses where request_id = pg_temp.fx('r4')$$,
  array[pg_temp.fx('reg'), pg_temp.fx('bak')],
  'an emergency invites regular and backup donors at once, and nobody outside the network unless asked'
);
select ok(
  (select current_tier = 'backup' and emergency_acknowledged_at is not null from public.blood_requests where id = pg_temp.fx('r4')),
  'an emergency starts at the backup tier and records the acknowledgement'
);

insert into fx select 'r5', (public.create_blood_request(
  patient_id => pg_temp.fx('patient'), required_at => now() + interval '6 days',
  treating_centre => 'Centre', district_id => 1, units_needed => 1, is_emergency => true)).id::text;
select public.publish_blood_request(pg_temp.fx('r5'), emergency_acknowledged => true, notify_emergency_donors => true);
select set_eq(
  $$select donor_id from public.donor_responses where request_id = pg_temp.fx('r5') and invited_via = 'broad'$$,
  array[pg_temp.fx('emerg')],
  'opting in also invites donors who accept emergency requests in the district'
);
select is((select current_tier::text from public.blood_requests where id = pg_temp.fx('r5')), 'broad',
  'an emergency with nearby donors notified goes straight to the broad tier');

-- ===== Patient-side connection requests =====
select pg_temp.login(pg_temp.fx('stranger'));
select is(
  pg_temp.expect_error(format($$select public.request_connection_to_donor('%s', '%s')$$, pg_temp.fx('patient'), pg_temp.fx('srch')), 'not_authorized'),
  'OK', 'a non-manager cannot ask donors to join someone else''s patient'
);

select pg_temp.login(pg_temp.fx('g'));
select is(
  pg_temp.expect_error(format($$select public.request_connection_to_donor('%s', '%s')$$, pg_temp.fx('patient'), pg_temp.fx('hidden')), 'donor_not_available'),
  'OK', 'a manager cannot send a connection request to a donor who did not opt in'
);
insert into fx select 'conn_srch', id::text from public.request_connection_to_donor(pg_temp.fx('patient'), pg_temp.fx('srch'), 'backup');
select is(
  pg_temp.expect_error(format($$select public.respond_connection('%s', true)$$, pg_temp.fx('conn_srch')), 'not_authorized'),
  'OK', 'the manager who sent the request cannot accept it themselves'
);

select pg_temp.login(pg_temp.fx('srch'));
select is(
  (select status::text || '/' || tier::text from public.respond_connection(pg_temp.fx('conn_srch'), true)),
  'active/backup', 'the donor accepts and the tier the manager chose is kept'
);

reset role;
select is(
  (select count(*)::int from public.notifications where user_id = pg_temp.fx('g') and type = 'connection_accepted' and entity_id = pg_temp.fx('conn_srch')),
  1, 'the managers are told the donor accepted'
);

select * from finish();
rollback;
