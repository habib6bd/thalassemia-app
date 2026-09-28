-- Phase 4a pgTAP: aggregate-only analytics with small-count suppression and
-- anonymous content view counts (phase-3-4.md 4a).
begin;
select plan(16);

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

insert into auth.users (id, email) values
  ('a4000000-0000-0000-0000-000000000001', 'admin@an.local'),
  ('a4000000-0000-0000-0000-000000000002', 'guardian@an.local'),
  ('a4000000-0000-0000-0000-000000000003', 'donor@an.local');
insert into fx values
  ('admin', 'a4000000-0000-0000-0000-000000000001'),
  ('guardian', 'a4000000-0000-0000-0000-000000000002'),
  ('donor', 'a4000000-0000-0000-0000-000000000003');

set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Admin', null, 1, null, 'bn', false);
select pg_temp.login(pg_temp.fx('guardian'));
select public.complete_onboarding(array['guardian']::public.app_role[], 'Guardian', null, 1, null, 'bn', false);
insert into fx select 'p', (public.create_patient(display_name => 'Secret Patient Name', blood_group => 'O_POS', district_id => 1)).id::text;
insert into fx select 'pcode', invite_code from public.patients where id = pg_temp.fx('p');
select pg_temp.login(pg_temp.fx('donor'));
select public.complete_onboarding(array['donor']::public.app_role[], 'Donor', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'O_POS');
insert into fx select 'conn', id::text from public.request_connection_by_code(pg_temp.fxt('pcode'));
select pg_temp.login(pg_temp.fx('guardian'));
select public.respond_connection(pg_temp.fx('conn'), true);
insert into fx select 'r', (public.create_blood_request(
  patient_id => pg_temp.fx('p'), required_at => now() + interval '1 day',
  treating_centre => 'Centre', district_id => 1)).id::text;
select public.publish_blood_request(pg_temp.fx('r'));
select pg_temp.login(pg_temp.fx('donor'));
select public.respond_to_request((select id from public.donor_responses where request_id = pg_temp.fx('r')), true);
select pg_temp.login(pg_temp.fx('guardian'));
select public.confirm_donation((select id from public.donor_responses where request_id = pg_temp.fx('r')), current_date);

reset role;
insert into public.user_roles (user_id, role) values (pg_temp.fx('admin'), 'admin');
-- Give the first response a measurable delay.
update public.blood_requests set published_at = published_at - interval '30 minutes' where id = pg_temp.fx('r');
set local role authenticated;

-- ===== Access =====
select pg_temp.login(pg_temp.fx('guardian'));
select is(pg_temp.expect_error($$select public.admin_analytics()$$, 'not_authorized'), 'OK',
  'non-admins cannot read analytics');
select throws_ok($$select * from public.content_view_counts$$, '42501', null,
  'users cannot read view counts directly');

-- ===== Suppression (default min cell size 5) =====
select pg_temp.login(pg_temp.fx('admin'));
select is(public.admin_analytics() -> 'active_patients', 'null'::jsonb, 'a count of 1 is hidden');
select is(public.admin_analytics() -> 'emergency_requests', '0'::jsonb, 'a count of 0 is shown as 0');
select is(public.admin_analytics() -> 'fulfilment_rate', 'null'::jsonb, 'a rate over fewer than 5 requests is hidden');
select is(public.admin_analytics() -> 'median_first_response_minutes', 'null'::jsonb,
  'a median over fewer than 5 requests is hidden');
select ok(position('Secret Patient Name' in public.admin_analytics()::text) = 0, 'no names appear in analytics');
select ok(not (public.admin_analytics() ? 'patients'), 'no per-person lists');

-- ===== Values when the minimum cell size allows them =====
reset role;
update public.app_settings set value = '1' where key = 'analytics_min_cell_size';
set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select is((public.admin_analytics() ->> 'active_patients')::int, 1, 'active patients are counted');
select is((public.admin_analytics() ->> 'patients_with_network')::int, 1, 'patients with an active network are counted');
select is((public.admin_analytics() ->> 'completed_donations')::int, 1, 'completed donations are counted');
select is((public.admin_analytics() ->> 'fulfilment_rate')::numeric, 1.000, 'fulfilment rate = fulfilled / closed');
select ok((public.admin_analytics() ->> 'median_first_response_minutes')::numeric >= 29,
  'median time to first "I can donate" is measured from publishing');

-- ===== Content views =====
reset role;
update public.content_sources set accessed_at = current_date;
update public.awareness_content set review_status = 'approved', reviewed_by = pg_temp.fx('admin'), reviewed_at = now()
  where slug = 'what-is-thalassemia';
update public.awareness_content set review_status = 'published', published_at = now(), next_review_due = current_date + 365
  where slug = 'what-is-thalassemia';
set local role authenticated;
select pg_temp.login(pg_temp.fx('guardian'));
select public.record_content_view((select id from public.awareness_content where slug = 'what-is-thalassemia'));
select public.record_content_view((select id from public.awareness_content where slug = 'what-is-thalassemia'));
-- A draft is invisible to users, but pass its id anyway: it must not count.
select public.record_content_view('5d000000-0000-4000-8000-000000000002');
reset role;
select is((select sum(views)::int from public.content_view_counts), 2, 'views are counted for published content only');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'content_view_counts' and column_name like '%user%'
), 'view counts store no user id');
set local role authenticated;
select pg_temp.login(pg_temp.fx('admin'));
select is((public.admin_analytics() #>> '{top_content,0,views}')::int, 2, 'top content lists view counts');

select * from finish();
rollback;
