-- Phase 4d load-test fix (docs/TESTING_REPORT.md, finding LT-1).
--
-- Q6: a donor may hold only one active commitment (accepted /
-- donation_pending on a live request). respond_to_request() checks this, but
-- two accepts by the same donor on two requests, at the same instant, each
-- saw "no other commitment" and both succeeded (reproduced by
-- scripts/load/concurrency.sh, scenario C2).
--
-- This trigger serialises a donor's transitions into an active commitment on
-- their donor_profiles row and re-checks the rule after taking the lock, so
-- the second transaction sees the first one's committed accept.

create function public.enforce_single_active_commitment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('accepted', 'donation_pending')
     and old.status not in ('accepted', 'donation_pending') then
    perform 1 from public.donor_profiles dp where dp.user_id = new.donor_id for update;

    if exists (
      select 1
      from public.donor_responses dr
      join public.blood_requests br on br.id = dr.request_id
      where dr.donor_id = new.donor_id
        and dr.id <> new.id
        and dr.status in ('accepted', 'donation_pending')
        and br.status not in ('cancelled', 'expired', 'fulfilled')
    ) then
      raise exception using errcode = 'P0001', message = 'donor_has_active_commitment';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_single_active_commitment
  before update of status on public.donor_responses
  for each row execute function public.enforce_single_active_commitment();
