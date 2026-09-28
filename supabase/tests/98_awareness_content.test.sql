-- Phase 3 pgTAP: awareness CMS. Nothing seeded is published; publishing needs
-- a human review and human-checked sources; users see published content only;
-- review workflow transitions; re-review reminder job (phase-3-4.md Phase 3).
begin;
select plan(41);

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

-- ===== Seeded drafts =====
select is((select count(*)::int from public.awareness_content where review_status <> 'draft'), 0,
  'no seeded content is published or in review');
select ok((select bool_and(drafted_by = 'agent') from public.awareness_content), 'seeded content is marked as agent-drafted');
select is((select count(*)::int from public.content_sources where accessed_at is not null), 0,
  'seeded sources are not marked as checked');
select is((select count(*)::int from public.awareness_content c
           where not exists (select 1 from public.content_source_links l where l.content_id = c.id)), 0,
  'every seeded draft cites at least one source');

insert into auth.users (id, email) values
  ('e8000000-0000-0000-0000-000000000001', 'editor@cms.local'),
  ('e8000000-0000-0000-0000-000000000002', 'reader@cms.local');
insert into fx values
  ('admin', 'e8000000-0000-0000-0000-000000000001'),
  ('reader', 'e8000000-0000-0000-0000-000000000002'),
  ('draft', '5d000000-0000-4000-8000-000000000002'),
  ('src', '5c000000-0000-4000-8000-000000000001');

set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Editor', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('reader'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Reader', null, 1, null, 'bn', false);
reset role;
insert into public.user_roles (user_id, role) values (pg_temp.fx('admin'), 'admin');
set local role authenticated;

-- ===== Users see nothing unpublished =====
select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.awareness_content), 0, 'users see no draft content');
select is((select count(*)::int from public.content_sources), 0, 'users see no sources of unpublished content');
select throws_ok($$select review_note from public.awareness_content$$, '42501', null,
  'users cannot read review notes');
select is(pg_temp.expect_error($$select * from public.admin_list_content()$$, 'not_authorized'), 'OK',
  'users cannot list all content');
select is(pg_temp.expect_error(format($$select public.admin_transition_content('%s', 'in_review')$$, pg_temp.fx('draft')), 'not_authorized'), 'OK',
  'users cannot move content through review');
select is(pg_temp.expect_error($$select public.admin_upsert_content(null, 'article', 'x', 'screening', 'x', 'x', 'x', 'x')$$, 'not_authorized'), 'OK',
  'users cannot write content');
select is(pg_temp.expect_error($$select public.admin_upsert_content_source(null, 'x', 'https://example.org')$$, 'not_authorized'), 'OK',
  'users cannot add sources');
select throws_ok($$insert into public.awareness_content (slug, category, title_bn, title_en, body_bn, body_en) values ('x', 'screening', 'x', 'x', 'x', 'x')$$,
  '42501', null, 'content cannot be inserted directly');

-- ===== Workflow =====
select pg_temp.login(pg_temp.fx('admin'));
select is((select count(*)::int from public.admin_list_content()), 10, 'admins list all content');
select is(pg_temp.expect_error(format($$select public.admin_transition_content('%s', 'published')$$, pg_temp.fx('draft')), 'invalid_transition'), 'OK',
  'a draft cannot be published directly');
select is(pg_temp.expect_error(format($$select public.admin_transition_content('%s', 'approved')$$, pg_temp.fx('draft')), 'invalid_transition'), 'OK',
  'a draft cannot be approved without review');
select lives_ok(format($$select public.admin_transition_content('%s', 'in_review')$$, pg_temp.fx('draft')), 'draft → in_review');
select lives_ok(format($$select public.admin_transition_content('%s', 'approved', 'checked against WHO/CDC')$$, pg_temp.fx('draft')),
  'in_review → approved');
select is((public.admin_get_content(pg_temp.fx('draft')) ->> 'reviewed_by')::uuid, pg_temp.fx('admin'),
  'approval records the human reviewer');
select is(pg_temp.expect_error(format($$select public.admin_transition_content('%s', 'published')$$, pg_temp.fx('draft')), 'source_not_checked'), 'OK',
  'content citing an unchecked source cannot be published');

-- Mark the sources as checked (a human opened them).
select public.admin_upsert_content_source(s.id, s.title, s.url, s.organization, current_date)
from public.content_sources s
where s.id in (select source_id from public.content_source_links where content_id = pg_temp.fx('draft'));
select is(pg_temp.expect_error($$select public.admin_upsert_content_source(null, 'Future', 'https://example.org', null, current_date + 1)$$, 'invalid_source'), 'OK',
  'a source cannot be checked in the future');
select is(pg_temp.expect_error($$select public.admin_upsert_content_source(null, 'Bad', 'not-a-url')$$, 'invalid_source'), 'OK',
  'a source needs a valid URL');

select lives_ok(format($$select public.admin_transition_content('%s', 'published')$$, pg_temp.fx('draft')), 'approved → published');
select ok((select (c ->> 'published_at') is not null and (c ->> 'next_review_due')::date = (current_date + interval '12 months')::date
           from public.admin_get_content(pg_temp.fx('draft')) c),
  'publishing sets published_at and next_review_due from content_review_months');
select ok(exists (select 1 from public.audit_logs where action = 'content_published' and row_id = pg_temp.fx('draft')),
  'publishing is audited');

select is(pg_temp.expect_error(format($$select public.admin_upsert_content('%s', 'article', 'what-is-a-carrier', 'what_is_carrier', 'x', 'x', 'x', 'x')$$, pg_temp.fx('draft')), 'content_locked'), 'OK',
  'published content cannot be edited in place');
select is(pg_temp.expect_error(format($$select public.admin_set_content_sources('%s', '{}')$$, pg_temp.fx('draft')), 'content_locked'), 'OK',
  'sources of published content cannot be changed');
select is(pg_temp.expect_error(format($$select public.admin_upsert_content_source('%s', 'x', 'https://www.who.int/health-topics/thalassaemia')$$, pg_temp.fx('src')), 'source_in_use'), 'OK',
  'a source cited by published content cannot be marked unchecked');

-- ===== Readers =====
select pg_temp.login(pg_temp.fx('reader'));
select is((select slug from public.awareness_content), 'what-is-a-carrier', 'users see published content');
select ok((select count(*) from public.content_sources) >= 1, 'users see the sources of published content');
select is((select count(*)::int from public.content_source_links), (
  select count(*)::int from public.content_source_links where content_id = pg_temp.fx('draft')),
  'users see only source links of published content');

-- ===== Edit → back to draft, retire =====
select pg_temp.login(pg_temp.fx('admin'));
insert into fx select 'new', (public.admin_upsert_content(null, 'faq', ' New-FAQ ', 'screening', 'প্রশ্ন', 'Question', 'উত্তর', 'Answer')).id::text;
select is((select (c ->> 'slug') || ':' || (c ->> 'review_status') || ':' || (c ->> 'drafted_by') from public.admin_get_content(pg_temp.fx('new')) c),
  'new-faq:draft:human', 'an admin can create a draft (slug normalised)');
select is(pg_temp.expect_error($$select public.admin_upsert_content(null, 'faq', 'new-faq', 'screening', 'x', 'x', 'x', 'x')$$, 'slug_taken'), 'OK',
  'slugs are unique');
select is(pg_temp.expect_error($$select public.admin_upsert_content(null, 'faq', 'Bad Slug!', 'screening', 'x', 'x', 'x', 'x')$$, 'invalid_content'), 'OK',
  'slugs must be url-safe');
select public.admin_transition_content(pg_temp.fx('new'), 'in_review');
select public.admin_transition_content(pg_temp.fx('new'), 'approved');
select public.admin_upsert_content(pg_temp.fx('new'), 'faq', 'new-faq', 'screening', 'প্রশ্ন', 'Question (edited)', 'উত্তর', 'Answer');
select is((select (c ->> 'review_status') || ':' || coalesce(c ->> 'reviewed_by', 'none') from public.admin_get_content(pg_temp.fx('new')) c),
  'draft:none', 'editing approved content sends it back to draft and clears the review');
select public.admin_transition_content(pg_temp.fx('new'), 'in_review');
select public.admin_transition_content(pg_temp.fx('new'), 'approved');
select is(pg_temp.expect_error(format($$select public.admin_transition_content('%s', 'published')$$, pg_temp.fx('new')), 'source_required'), 'OK',
  'content without sources cannot be published');

select lives_ok(format($$select public.admin_transition_content('%s', 'retired')$$, pg_temp.fx('draft')), 'published → retired');
select pg_temp.login(pg_temp.fx('reader'));
select is((select count(*)::int from public.awareness_content), 0, 'retired content is hidden from users');

-- ===== Re-review reminder =====
select pg_temp.login(pg_temp.fx('admin'));
select public.admin_transition_content(pg_temp.fx('draft'), 'draft');
select public.admin_transition_content(pg_temp.fx('draft'), 'in_review');
select public.admin_transition_content(pg_temp.fx('draft'), 'approved');
select public.admin_transition_content(pg_temp.fx('draft'), 'published');
reset role;
update public.awareness_content set next_review_due = current_date - 1 where id = pg_temp.fx('draft');
select public.process_content_review_due();
select public.process_content_review_due();
select is((select count(*)::int from public.notifications where user_id = pg_temp.fx('admin') and type = 'content_review_due'), 1,
  'admins are reminded once when published content is due for review');
select ok(exists (select 1 from cron.job where jobname = 'process-content-review-due'), 'the review reminder job is scheduled');

set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select lives_ok(format($$select public.admin_transition_content('%s', 'published', 're-reviewed')$$, pg_temp.fx('draft')),
  're-reviewing keeps content published');
reset role;
select ok((select next_review_due > current_date and review_reminded_at is null from public.awareness_content where id = pg_temp.fx('draft')),
  're-review restarts the review clock');

select * from finish();
rollback;
