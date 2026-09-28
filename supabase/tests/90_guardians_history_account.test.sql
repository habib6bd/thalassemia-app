-- Phase 2b pgTAP: guardian invites + manager removal, donation history,
-- appreciation messages, data export, account deletion (phase-2.md 2b).
begin;
select plan(49);

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

-- Returns how many rows an UPDATE touched (RLS silently filters rows).
create or replace function pg_temp.rows_updated(query text) returns int
language plpgsql as $$
declare n int;
begin
  execute query;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function pg_temp.rows_updated(text) to authenticated;

create temp table fx (k text primary key, v text);
grant all on fx to authenticated, anon, service_role;
create or replace function pg_temp.fx(key text) returns uuid
language sql stable as $$ select v::uuid from fx where k = key $$;
grant execute on function pg_temp.fx(text) to authenticated, anon;
create or replace function pg_temp.fxt(key text) returns text
language sql stable as $$ select v from fx where k = key $$;
grant execute on function pg_temp.fxt(text) to authenticated, anon;

-- e9..01 primary guardian  02 invited guardian  03 stranger guardian
-- 04 donor (later deletes account)  05 sole guardian of a second patient
insert into auth.users (id, email) values
  ('e9000000-0000-0000-0000-000000000001', 'g1@t.local'),
  ('e9000000-0000-0000-0000-000000000002', 'g2@t.local'),
  ('e9000000-0000-0000-0000-000000000003', 'g3@t.local'),
  ('e9000000-0000-0000-0000-000000000004', 'd1@t.local'),
  ('e9000000-0000-0000-0000-000000000005', 'g4@t.local');

insert into fx values
  ('g1', 'e9000000-0000-0000-0000-000000000001'),
  ('g2', 'e9000000-0000-0000-0000-000000000002'),
  ('g3', 'e9000000-0000-0000-0000-000000000003'),
  ('d1', 'e9000000-0000-0000-0000-000000000004'),
  ('g4', 'e9000000-0000-0000-0000-000000000005');

set local role authenticated;

select pg_temp.login(pg_temp.fx('g1'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian One', '+8801700000001', 1, null, 'bn', true);
insert into fx select 'p', (public.create_patient(display_name => 'Patient P', blood_group => 'AB_POS', district_id => 1, thalassemia_type => 'beta')).id::text;
insert into fx select 'pcode', invite_code from public.patients where id = pg_temp.fx('p');

select pg_temp.login(pg_temp.fx('g2'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Guardian Two', null, 1, null, 'bn', false);

select pg_temp.login(pg_temp.fx('g3'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Stranger', null, 1, null, 'bn', false);

select pg_temp.login(pg_temp.fx('d1'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor One', '+8801700000004', 1, 'Mirpur', 'bn', true);
select public.upsert_donor_profile(blood_group => 'AB_POS', searchable => true);
insert into fx select 'conn', id::text from public.request_connection_by_code(pg_temp.fxt('pcode'));

select pg_temp.login(pg_temp.fx('g1'));
select public.respond_connection(pg_temp.fx('conn'), true);

-- A confirmed donation for history/appreciation tests.
insert into fx select 'r1', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '1 day',
  treating_centre => 'Centre', district_id => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('r1'));
select pg_temp.login(pg_temp.fx('d1'));
select public.respond_to_request((select id from public.donor_responses where request_id = pg_temp.fx('r1')), true);
select pg_temp.login(pg_temp.fx('g1'));
insert into fx select 'donation', (public.confirm_donation(
  (select id from public.donor_responses where request_id = pg_temp.fx('r1')), current_date)).id::text;

-- ===== Guardian invites =====
select pg_temp.login(pg_temp.fx('g3'));
select is(
  pg_temp.expect_error(format($$select public.create_guardian_invite('%s')$$, pg_temp.fx('p')), 'not_authorized'),
  'OK', 'a stranger cannot create a guardian invite');

select pg_temp.login(pg_temp.fx('g1'));
insert into fx select 'gcode', code from public.create_guardian_invite(pg_temp.fx('p'));
select isnt(pg_temp.fxt('gcode'), null, 'a manager can create a guardian invite code');

select pg_temp.login(pg_temp.fx('g3'));
select is((select count(*)::int from public.guardian_invites), 0, 'a stranger cannot see guardian invites');
select lives_ok($$select public.add_role('donor')$$, 'add_role works for an active account');
select ok(public.has_role('donor'), 'add_role grants the role');

select pg_temp.login(pg_temp.fx('g2'));
select is(public.accept_guardian_invite(lower(pg_temp.fxt('gcode'))), pg_temp.fx('p'),
  'accepting a code (any case) returns the patient');
select ok(public.is_patient_manager(pg_temp.fx('p')), 'the invited user is now a manager');
select ok(public.has_role('guardian'), 'accepting grants the guardian role');
select is((select relation::text from public.patient_managers where patient_id = pg_temp.fx('p') and user_id = pg_temp.fx('g2')),
  'guardian', 'the new manager is a non-primary guardian');

select pg_temp.login(pg_temp.fx('g3'));
select is(
  pg_temp.expect_error(format($$select public.accept_guardian_invite('%s')$$, pg_temp.fxt('gcode')), 'invite_invalid'),
  'OK', 'a used code cannot be reused');

select pg_temp.login(pg_temp.fx('g1'));
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('g1') and type = 'guardian_added'),
  1, 'existing managers are told a guardian joined');

select pg_temp.login(pg_temp.fx('g2'));
select is((select count(*)::int from public.get_patient_managers(pg_temp.fx('p'))), 2, 'managers see the list of co-managers');
select pg_temp.login(pg_temp.fx('g3'));
select is(
  pg_temp.expect_error(format($$select * from public.get_patient_managers('%s')$$, pg_temp.fx('p')), 'not_authorized'),
  'OK', 'a stranger cannot list managers');

-- Expired invite.
select pg_temp.login(pg_temp.fx('g1'));
insert into fx select 'gcode_old', code from public.create_guardian_invite(pg_temp.fx('p'));
reset role;
update public.guardian_invites set expires_at = now() - interval '1 minute' where code = pg_temp.fxt('gcode_old');
set local role authenticated;
select pg_temp.login(pg_temp.fx('g3'));
select is(
  pg_temp.expect_error(format($$select public.accept_guardian_invite('%s')$$, pg_temp.fxt('gcode_old')), 'invite_invalid'),
  'OK', 'an expired code is rejected');

-- Revoked invite.
select pg_temp.login(pg_temp.fx('g1'));
insert into fx select 'ginv_rev', id::text from public.create_guardian_invite(pg_temp.fx('p'));
select public.revoke_guardian_invite(pg_temp.fx('ginv_rev'));
select pg_temp.login(pg_temp.fx('g3'));
select is(
  pg_temp.expect_error(format($$select public.accept_guardian_invite('%s')$$,
    (select code from public.guardian_invites where id = pg_temp.fx('ginv_rev'))), 'invite_invalid'),
  'OK', 'a revoked code is rejected');

-- Manager limit (product rule from app_settings).
reset role;
update public.app_settings set value = '2' where key = 'max_patient_managers';
set local role authenticated;
select pg_temp.login(pg_temp.fx('g1'));
select is(
  pg_temp.expect_error(format($$select public.create_guardian_invite('%s')$$, pg_temp.fx('p')), 'manager_limit_reached'),
  'OK', 'invites stop at max_patient_managers');
reset role;
update public.app_settings set value = '5' where key = 'max_patient_managers';
set local role authenticated;

-- ===== Removing / leaving =====
select pg_temp.login(pg_temp.fx('g2'));
select is(
  pg_temp.expect_error(format($$select public.remove_patient_manager('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('g1')), 'not_authorized'),
  'OK', 'a non-primary guardian cannot remove the primary');

select pg_temp.login(pg_temp.fx('g1'));
select lives_ok(format($$select public.remove_patient_manager('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('g2')),
  'the primary guardian can remove another guardian');
select pg_temp.login(pg_temp.fx('g2'));
select ok(not public.is_patient_manager(pg_temp.fx('p')), 'the removed guardian loses access');
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('g2') and type = 'guardian_removed'),
  1, 'the removed guardian is notified');

select pg_temp.login(pg_temp.fx('g1'));
select is(
  pg_temp.expect_error(format($$select public.remove_patient_manager('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('g1')), 'last_manager'),
  'OK', 'the last manager cannot leave');

-- Primary leaves -> the remaining guardian becomes primary.
insert into fx select 'gcode2', code from public.create_guardian_invite(pg_temp.fx('p'));
select pg_temp.login(pg_temp.fx('g2'));
select public.accept_guardian_invite(pg_temp.fxt('gcode2'));
select pg_temp.login(pg_temp.fx('g1'));
select public.remove_patient_manager(pg_temp.fx('p'), pg_temp.fx('g1'));
select pg_temp.login(pg_temp.fx('g2'));
select ok((select is_primary from public.patient_managers where patient_id = pg_temp.fx('p') and user_id = pg_temp.fx('g2')),
  'when the primary leaves, the remaining guardian becomes primary');

-- ===== History =====
select is((select donor_display_name from public.get_patient_donation_history(pg_temp.fx('p'))), 'Donor One',
  'managers see who donated to their patient');
select pg_temp.login(pg_temp.fx('g3'));
select is(
  pg_temp.expect_error(format($$select * from public.get_patient_donation_history('%s')$$, pg_temp.fx('p')), 'not_authorized'),
  'OK', 'a stranger cannot read a patient''s donation history');

select pg_temp.login(pg_temp.fx('d1'));
select is((select patient_display_name from public.get_my_donation_history()), 'Patient P',
  'a connected donor sees the patient''s name in their history');

-- ===== Appreciation =====
select is(
  pg_temp.expect_error(format($$select public.send_appreciation('%s', 'hi')$$, pg_temp.fx('donation')), 'not_authorized'),
  'OK', 'a donor cannot send appreciation for their own donation');

select pg_temp.login(pg_temp.fx('g2'));
select is(
  pg_temp.expect_error(format($$select public.send_appreciation('%s', '   ')$$, pg_temp.fx('donation')), 'invalid_message'),
  'OK', 'an empty message is rejected');
insert into fx select 'appr', id::text from public.send_appreciation(pg_temp.fx('donation'), 'Thank you so much!');
select isnt(pg_temp.fxt('appr'), null, 'a manager can thank the donor');
select is(
  pg_temp.expect_error(format($$select public.send_appreciation('%s', 'again')$$, pg_temp.fx('donation')), 'appreciation_already_sent'),
  'OK', 'only one thank-you per donation');

select pg_temp.login(pg_temp.fx('g3'));
select is((select count(*)::int from public.appreciation_messages), 0, 'strangers cannot read appreciation messages');
select is(
  pg_temp.expect_error(format($$select public.hide_appreciation('%s')$$, pg_temp.fx('appr')), 'not_authorized'),
  'OK', 'only the recipient can hide a message');
select is(
  pg_temp.expect_error(format($$select public.remove_appreciation('%s')$$, pg_temp.fx('appr')), 'not_authorized'),
  'OK', 'only an admin can remove a message');

select pg_temp.login(pg_temp.fx('d1'));
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('d1') and type = 'appreciation_received'),
  1, 'the donor is notified of the thank-you');
select is((select appreciation_message from public.get_my_donation_history()), 'Thank you so much!',
  'the donor sees the message in their history');
select public.hide_appreciation(pg_temp.fx('appr'));
select is((select appreciation_message from public.get_my_donation_history()), null,
  'a hidden message no longer shows');

-- ===== Export =====
select is(jsonb_array_length(public.export_my_data() -> 'donations_given'), 1, 'export includes the donor''s donations');
select is(public.export_my_data() #>> '{profile,display_name}', 'Donor One', 'export includes the profile');

-- ===== Account deletion (donor) =====
select pg_temp.login(pg_temp.fx('g2'));
insert into fx select 'r2', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '3 days',
  treating_centre => 'Centre', district_id => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('r2'));
select pg_temp.login(pg_temp.fx('d1'));
select public.respond_to_request((select id from public.donor_responses where request_id = pg_temp.fx('r2')), true);

select lives_ok($$select public.delete_my_account()$$, 'a user can delete their account');
select lives_ok($$select public.delete_my_account()$$, 'deleting twice is harmless');

select pg_temp.login(pg_temp.fx('g2'));
select is((select status::text from public.donor_responses where request_id = pg_temp.fx('r2')), 'cancelled',
  'the deleted donor''s accepted response is cancelled');
select is((select status::text from public.blood_requests where id = pg_temp.fx('r2')), 'open',
  'the request goes back to open');
select is((select status::text from public.patient_donor_connections where id = pg_temp.fx('conn')), 'removed',
  'the deleted donor leaves the patient''s network');
select ok((select donor_deleted and donor_display_name is null from public.get_patient_donation_history(pg_temp.fx('p'))),
  'past donations stay, shown as a deleted user');

reset role;
select ok(
  (select deleted_at is not null and phone is null and area is null and display_name = 'deleted'
   from public.profiles where user_id = pg_temp.fx('d1')),
  'the profile is anonymised');
select is((select count(*)::int from public.user_roles where user_id = pg_temp.fx('d1')), 0, 'all roles are removed');
set local role authenticated;

select pg_temp.login(pg_temp.fx('d1'));
select is(pg_temp.expect_error($$select public.add_role('donor')$$, 'account_deleted'), 'OK',
  'a deleted account cannot take roles again');
select is(pg_temp.rows_updated(format($$update public.profiles set display_name = 'Back' where user_id = '%s'$$, pg_temp.fx('d1'))),
  0, 'a deleted account cannot edit its profile');

-- ===== Account deletion (sole manager) =====
select pg_temp.login(pg_temp.fx('g4'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Solo', null, 1, null, 'bn', false);
insert into fx select 'q', (public.create_patient(display_name => 'Patient Q', blood_group => 'O_POS', district_id => 1, thalassemia_type => 'beta')).id::text;
insert into fx select 'rq', (public.create_blood_request(
  patient_id => pg_temp.fx('q'), required_at => now() + interval '1 day',
  treating_centre => 'Centre', district_id => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('rq'));
select public.delete_my_account();

reset role;
select ok(
  (select archived_at is not null and display_name = 'deleted' and thalassemia_type is null
   from public.patients where id = pg_temp.fx('q')),
  'a patient with no remaining manager is archived and anonymised');
select is((select status::text from public.blood_requests where id = pg_temp.fx('rq')), 'cancelled',
  'their open requests are cancelled');

select * from finish();
rollback;
