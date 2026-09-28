-- Phase 4d regressions for load-test finding LT-1 (Q6 under concurrency).
-- The race itself is exercised by scripts/load/concurrency.sh; this pins the
-- trigger that closes it, independent of which code path updates the row.
begin;
select plan(2);

insert into auth.users (id, email) values
  ('f1000000-0000-0000-0000-000000000001', 'g@lt.local'),
  ('f1000000-0000-0000-0000-000000000002', 'd@lt.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.complete_onboarding(array['guardian']::public.app_role[], 'G', null, 1, null, 'bn', false);
create temp table p as select * from public.create_patient(display_name => 'P', blood_group => 'O_POS', district_id => 1);
create temp table r as
  select * from public.create_blood_request(patient_id => (select id from p), required_at => now() + interval '1 day', treating_centre => 'C', district_id => 1)
  union all
  select * from public.create_blood_request(patient_id => (select id from p), required_at => now() + interval '2 days', treating_centre => 'C', district_id => 1);
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.complete_onboarding(array['donor']::public.app_role[], 'D', null, 1, null, 'bn', false);
select public.upsert_donor_profile(blood_group => 'O_POS');
reset role;

update public.blood_requests set status = 'open' where id in (select id from r);
insert into public.donor_responses (request_id, donor_id, invited_via)
select id, 'f1000000-0000-0000-0000-000000000002', 'regular' from r;

update public.donor_responses set status = 'accepted'
where donor_id = 'f1000000-0000-0000-0000-000000000002'
  and request_id = (select id from r order by required_at limit 1);

select throws_ok(
  $$update public.donor_responses set status = 'accepted'
    where donor_id = 'f1000000-0000-0000-0000-000000000002'
      and request_id = (select id from r order by required_at desc limit 1)$$,
  'P0001', 'donor_has_active_commitment',
  'a second active commitment is refused on any update path'
);

select lives_ok(
  $$update public.donor_responses set status = 'donation_pending'
    where donor_id = 'f1000000-0000-0000-0000-000000000002'
      and request_id = (select id from r order by required_at limit 1)$$,
  'moving the existing commitment forward is still allowed'
);

select * from finish();
rollback;
