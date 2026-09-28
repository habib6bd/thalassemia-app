-- Phase 2c pgTAP: community posts/comments, guidelines gate, reports and
-- auto-hide, blocks (content both ways + connection requests), admin
-- moderation, account-deletion cleanup (phase-2.md 2c).
begin;
select plan(53);

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

-- c9..01 author (guardian of patient P)  02 reader  03 reporter A  04 reporter B
-- 05 admin  06 donor (blocks/is blocked)  07 later deletes account
insert into auth.users (id, email) values
  ('c9000000-0000-0000-0000-000000000001', 'author@t.local'),
  ('c9000000-0000-0000-0000-000000000002', 'reader@t.local'),
  ('c9000000-0000-0000-0000-000000000003', 'rep1@t.local'),
  ('c9000000-0000-0000-0000-000000000004', 'rep2@t.local'),
  ('c9000000-0000-0000-0000-000000000005', 'admin@t.local'),
  ('c9000000-0000-0000-0000-000000000006', 'donor@t.local'),
  ('c9000000-0000-0000-0000-000000000007', 'leaver@t.local');

insert into fx values
  ('author', 'c9000000-0000-0000-0000-000000000001'),
  ('reader', 'c9000000-0000-0000-0000-000000000002'),
  ('rep1', 'c9000000-0000-0000-0000-000000000003'),
  ('rep2', 'c9000000-0000-0000-0000-000000000004'),
  ('admin', 'c9000000-0000-0000-0000-000000000005'),
  ('donor', 'c9000000-0000-0000-0000-000000000006'),
  ('leaver', 'c9000000-0000-0000-0000-000000000007');

set local role authenticated;

select pg_temp.login(pg_temp.fx('author'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Author', null, 1, null, 'bn', false);
insert into fx select 'p', (public.create_patient(display_name => 'Patient P', blood_group => 'B_POS', district_id => 1)).id::text;
insert into fx select 'pcode', invite_code from public.patients where id = pg_temp.fx('p');

select pg_temp.login(pg_temp.fx('reader'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Reader', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('rep1'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Reporter One', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('rep2'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Reporter Two', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('admin'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Admin', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('donor'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor Six', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'B_POS', searchable => true);
select pg_temp.login(pg_temp.fx('leaver'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Leaver', null, 1, null, 'bn', false);

reset role;
insert into public.user_roles (user_id, role) values (pg_temp.fx('admin'), 'admin');
update public.app_settings set value = '2' where key = 'community_auto_hide_report_threshold';
set local role authenticated;

-- ===== Guidelines gate =====
select pg_temp.login(pg_temp.fx('author'));
select ok(not public.has_accepted_community_guidelines(), 'guidelines start unaccepted');
select is(
  pg_temp.expect_error($$select public.create_community_post('questions', 'Hello', 'Body')$$, 'guidelines_not_accepted'),
  'OK', 'posting requires accepting the community guidelines');
select lives_ok($$select public.accept_community_guidelines()$$, 'a user can accept the guidelines');
select lives_ok($$select public.accept_community_guidelines()$$, 'accepting twice is harmless');
select ok(public.has_accepted_community_guidelines(), 'acceptance is recorded');

-- ===== Posts =====
insert into fx select 'post', (public.create_community_post('transfusion_experience', '  My first transfusion  ', 'It went fine.')).id::text;
select is((select title from public.community_posts where id = pg_temp.fx('post')), 'My first transfusion',
  'title is trimmed and stored');
select is(
  pg_temp.expect_error($$select public.create_community_post('questions', '   ', 'Body')$$, 'invalid_post'),
  'OK', 'an empty title is rejected');
select throws_ok(
  $$insert into public.community_posts (author_id, topic, title, body) values (auth.uid(), 'questions', 't', 'b')$$,
  '42501', null, 'posts cannot be inserted directly (RPC only)');

reset role;
update public.app_settings set value = '2' where key = 'community_daily_post_limit';
set local role authenticated;
select public.create_community_post('questions', 'Second', 'Body');
select is(
  pg_temp.expect_error($$select public.create_community_post('questions', 'Third', 'Body')$$, 'post_limit_reached'),
  'OK', 'the daily post limit comes from app_settings');
reset role;
update public.app_settings set value = '10' where key = 'community_daily_post_limit';
set local role authenticated;

select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.list_community_posts()), 2, 'another user sees published posts in the feed');
select is((select count(*)::int from public.list_community_posts(topic_filter => 'transfusion_experience')), 1,
  'the feed filters by topic');
select is((select author_name from public.get_community_post(pg_temp.fx('post'))), 'Author',
  'a post shows its author display name');
select ok(not (select is_mine from public.get_community_post(pg_temp.fx('post'))), 'is_mine is false for others');
select is((select count(*)::int from public.community_posts where id = pg_temp.fx('post')), 1,
  'RLS lets a signed-in user read a published post');

-- ===== Comments =====
select is(
  pg_temp.expect_error(format($$select public.create_community_comment('%s', 'Nice')$$, pg_temp.fx('post')), 'guidelines_not_accepted'),
  'OK', 'commenting requires accepting the guidelines');
select public.accept_community_guidelines();
insert into fx select 'comment', (public.create_community_comment(pg_temp.fx('post'), 'Thanks for sharing')).id::text;
select is((select count(*)::int from public.list_community_comments(pg_temp.fx('post'))), 1, 'the comment is listed');
select is(
  pg_temp.expect_error(format($$select public.create_community_comment('%s', '  ')$$, pg_temp.fx('post')), 'invalid_comment'),
  'OK', 'an empty comment is rejected');

select pg_temp.login(pg_temp.fx('author'));
select is((select count(*)::int from public.notifications where type = 'community_comment_added'), 1,
  'the post author is notified about a new comment');
select is(
  pg_temp.expect_error(format($$select public.delete_community_comment('%s')$$, pg_temp.fx('comment')), 'not_authorized'),
  'OK', 'only its author can delete a comment');

-- ===== Reports and auto-hide =====
select is(
  pg_temp.expect_error(format($$select public.report_community_content('post', '%s', 'spam')$$, pg_temp.fx('post')), 'cannot_report_own'),
  'OK', 'an author cannot report their own post');

select pg_temp.login(pg_temp.fx('rep1'));
select lives_ok(format($$select public.report_community_content('post', '%s', 'selling_blood', 'asks for money')$$, pg_temp.fx('post')),
  'a user can report a post');
select is(
  pg_temp.expect_error(format($$select public.report_community_content('post', '%s', 'spam')$$, pg_temp.fx('post')), 'already_reported'),
  'OK', 'a user can report the same post only once');
select is(
  pg_temp.expect_error(format($$select public.report_community_content('user', '%s', 'spam')$$, pg_temp.fx('post')), 'invalid_target'),
  'OK', 'an unknown target type is rejected');
select is((select count(*)::int from public.reports), 1, 'a reporter sees their own report');
select is((select status::text from public.get_community_post(pg_temp.fx('post'))), 'published', 'one report does not hide a post');

select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.reports), 0, 'reports are not visible to other users');

select pg_temp.login(pg_temp.fx('rep2'));
select public.report_community_content('post', pg_temp.fx('post'), 'medical_misinformation', 'claims a cure');

select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.list_community_posts(topic_filter => 'transfusion_experience')), 0,
  'a post reaching the report threshold is hidden from the feed');
select is(
  pg_temp.expect_error(format($$select * from public.get_community_post('%s')$$, pg_temp.fx('post')), 'post_not_found'),
  'OK', 'a hidden post cannot be opened by others');
select is((select count(*)::int from public.community_posts where id = pg_temp.fx('post')), 0,
  'RLS hides a hidden post from others');

select pg_temp.login(pg_temp.fx('author'));
select is((select status::text from public.get_community_post(pg_temp.fx('post'))), 'hidden',
  'the author still sees their hidden post, marked hidden');

select pg_temp.login(pg_temp.fx('admin'));
select is((select count(*)::int from public.notifications where type in ('community_content_auto_hidden', 'community_report_urgent')), 2,
  'admins are notified about the selling-blood report and the auto-hide');

-- ===== Moderation =====
select pg_temp.login(pg_temp.fx('reader'));
select is(
  pg_temp.expect_error($$select * from public.list_moderation_queue()$$, 'not_authorized'),
  'OK', 'non-admins cannot read the moderation queue');
select is(
  pg_temp.expect_error(format($$select public.moderate_community_content('post', '%s', 'restore')$$, pg_temp.fx('post')), 'not_authorized'),
  'OK', 'non-admins cannot moderate');

select pg_temp.login(pg_temp.fx('admin'));
select is((select open_reports from public.list_moderation_queue() where target_id = pg_temp.fx('post')), 2,
  'the queue groups open reports per item');
select ok((select has_selling_blood from public.list_moderation_queue() where target_id = pg_temp.fx('post')),
  'the queue flags selling-blood reports');
select is(
  pg_temp.expect_error(format($$select public.moderate_community_content('post', '%s', 'ban')$$, pg_temp.fx('post')), 'invalid_action'),
  'OK', 'an unknown moderation action is rejected');
select lives_ok(format($$select public.moderate_community_content('post', '%s', 'restore', 'personal experience, fine')$$, pg_temp.fx('post')),
  'an admin can restore a hidden post');
select is((select count(*)::int from public.reports where post_id = pg_temp.fx('post') and status = 'dismissed'), 2,
  'restoring dismisses the open reports');
select is((select count(*)::int from public.list_moderation_queue()), 0, 'the queue is empty after review');
select ok(exists (select 1 from public.audit_logs where action = 'community_moderated' and row_id = pg_temp.fx('post')),
  'moderation is audited');

select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.list_community_posts(topic_filter => 'transfusion_experience')), 1,
  'a restored post is visible again');

select pg_temp.login(pg_temp.fx('admin'));
select public.moderate_community_content('comment', pg_temp.fx('comment'), 'remove');
select is(
  pg_temp.expect_error(format($$select public.moderate_community_content('comment', '%s', 'restore')$$, pg_temp.fx('comment')), 'invalid_transition'),
  'OK', 'removed content cannot be restored');

select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.list_community_comments(pg_temp.fx('post'))), 0,
  'a removed comment disappears, even for its author');
select is((select count(*)::int from public.notifications where type = 'community_content_moderated'), 1,
  'the author of removed content is notified');

-- ===== Blocks =====
select pg_temp.login(pg_temp.fx('reader'));
select is(
  pg_temp.expect_error(format($$select public.block_user('%s')$$, pg_temp.fx('reader')), 'invalid_target'),
  'OK', 'a user cannot block themselves');
select public.block_user(pg_temp.fx('author'));
select is((select count(*)::int from public.list_community_posts()), 0, 'a blocker no longer sees the blocked user''s posts');
select is((select count(*)::int from public.list_blocked_users()), 1, 'the blocker sees their block list');

select pg_temp.login(pg_temp.fx('author'));
select is((select count(*)::int from public.user_blocks), 0, 'the blocked user cannot see that they were blocked');
insert into fx select 'post2', (public.create_community_post('questions', 'Another', 'Body')).id::text;

select pg_temp.login(pg_temp.fx('reader'));
select is(
  pg_temp.expect_error(format($$select public.create_community_comment('%s', 'hi')$$, pg_temp.fx('post2')), 'post_not_found'),
  'OK', 'a blocker cannot comment on the blocked user''s post');
select public.unblock_user(pg_temp.fx('author'));
select is((select count(*)::int from public.list_community_posts()), 3, 'unblocking shows the posts again');

-- Blocking stops connection requests both ways.
select pg_temp.login(pg_temp.fx('donor'));
select public.block_user(pg_temp.fx('author'));
select is(
  pg_temp.expect_error(format($$select public.request_connection_by_code('%s')$$, pg_temp.fxt('pcode')), 'invalid_invite_code'),
  'OK', 'a donor who blocked a guardian cannot join that patient''s network');
select pg_temp.login(pg_temp.fx('author'));
select is(
  pg_temp.expect_error(format($$select public.request_connection_to_donor('%s', '%s')$$, pg_temp.fx('p'), pg_temp.fx('donor')), 'donor_not_available'),
  'OK', 'a guardian blocked by a donor cannot ask them to connect');

-- ===== Account deletion =====
select pg_temp.login(pg_temp.fx('leaver'));
select public.accept_community_guidelines();
insert into fx select 'leaverpost', (public.create_community_post('family_experience', 'Our story', 'Body')).id::text;
select public.delete_my_account();
reset role;
select is((select status::text from public.community_posts where id = pg_temp.fx('leaverpost')), 'deleted',
  'deleting an account takes down its community posts');

select * from finish();
rollback;
