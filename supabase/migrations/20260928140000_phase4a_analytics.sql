-- Phase 4a: aggregate-only analytics (phase-3-4.md 4a, master prompt §23,
-- ARCHITECTURE §6/§8, OPEN_QUESTIONS Q37–Q38).
--
-- Admins see counts, rates and medians only: no per-person or per-request
-- rows, and any count from 1 to (analytics_min_cell_size - 1) is returned as
-- null ("fewer than 5") so small groups can't be singled out. Content views
-- are counted per item per day without any user id.

insert into public.app_settings (key, value, description) values
  ('analytics_min_cell_size', '5', 'Analytics counts below this (but above 0) are hidden as "fewer than N" to protect privacy.')
on conflict (key) do nothing;

-- === content view counter (no user data) ======================================
create table public.content_view_counts (
  content_id uuid not null references public.awareness_content (id) on delete cascade,
  day date not null default current_date,
  views int not null default 0 check (views >= 0),
  primary key (content_id, day)
);

alter table public.content_view_counts enable row level security;
revoke all on public.content_view_counts from public, anon, authenticated;
-- No policies: read only through admin_analytics().

create function public.record_content_view(content_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  -- Only published items count; anything else is silently ignored.
  insert into public.content_view_counts (content_id, day, views)
  select c.id, current_date, 1
  from public.awareness_content c
  where c.id = record_content_view.content_id and c.review_status = 'published'
  on conflict on constraint content_view_counts_pkey do update set views = public.content_view_counts.views + 1;
end;
$$;

-- === small-count suppression ==================================================
create function public.suppress_small_count(n bigint)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when n > 0 and n < coalesce(
      (select (value #>> '{}')::int from public.app_settings where key = 'analytics_min_cell_size'), 5
    ) then null
    else n
  end;
$$;

-- === admin analytics ==========================================================
-- period_days: 1..365. Rates and medians are null when their base group is
-- smaller than the minimum cell size.
create function public.admin_analytics(period_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(coalesce(period_days, 30), 1), 365);
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(period_days, 30), 1), 365));
  v_min int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'analytics_min_cell_size'), 5);
  v_closed bigint;
  v_fulfilled bigint;
  v_response_n bigint;
  v_median_minutes numeric;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  select
    count(*) filter (where br.status in ('fulfilled', 'cancelled', 'expired')),
    count(*) filter (where br.status = 'fulfilled')
  into v_closed, v_fulfilled
  from public.blood_requests br
  where br.closed_at >= v_since;

  -- Time from publishing to the first donor who said "I can donate".
  select count(*), percentile_cont(0.5) within group (order by minutes)
  into v_response_n, v_median_minutes
  from (
    select extract(epoch from (min(dr.responded_at) - br.published_at)) / 60 as minutes
    from public.blood_requests br
    join public.donor_responses dr on dr.request_id = br.id
    where br.published_at >= v_since
      and dr.responded_at is not null
      and dr.status in ('accepted', 'donation_pending', 'completed')
    group by br.id, br.published_at
  ) first_responses;

  return jsonb_build_object(
    'period_days', v_days,
    'min_cell_size', v_min,
    'active_patients', public.suppress_small_count((
      select count(*) from public.patients p
      where p.archived_at is null
        and exists (select 1 from public.patient_managers pm where pm.patient_id = p.id)
    )),
    'active_donors', public.suppress_small_count((
      select count(*) from public.donor_profiles d
      join public.profiles pr on pr.user_id = d.user_id
      where pr.deleted_at is null and d.availability <> 'paused'
    )),
    'patients_with_network', public.suppress_small_count((
      select count(distinct c.patient_id) from public.patient_donor_connections c where c.status = 'active'
    )),
    'active_connections', public.suppress_small_count((
      select count(*) from public.patient_donor_connections c where c.status = 'active'
    )),
    'requests_created', public.suppress_small_count((
      select count(*) from public.blood_requests br where br.created_at >= v_since
    )),
    'emergency_requests', public.suppress_small_count((
      select count(*) from public.blood_requests br where br.created_at >= v_since and br.is_emergency
    )),
    'requests_closed', public.suppress_small_count(v_closed),
    'requests_fulfilled', public.suppress_small_count(v_fulfilled),
    'fulfilment_rate', case when v_closed >= v_min then round(v_fulfilled::numeric / v_closed, 3) end,
    'median_first_response_minutes', case when v_response_n >= v_min then round(v_median_minutes) end,
    'completed_donations', public.suppress_small_count((
      select count(*) from public.donations d where d.created_at >= v_since
    )),
    'org_verified_donations', public.suppress_small_count((
      select count(*) from public.donations d where d.created_at >= v_since and d.verification = 'org_verified'
    )),
    'community_posts', public.suppress_small_count((
      select count(*) from public.community_posts cp where cp.created_at >= v_since and cp.status <> 'deleted'
    )),
    'community_reports', public.suppress_small_count((
      select count(*) from public.reports r where r.created_at >= v_since
    )),
    'content_views', public.suppress_small_count((
      select coalesce(sum(v.views), 0) from public.content_view_counts v where v.day >= v_since::date
    )),
    'requests_by_division', coalesce((
      select jsonb_agg(jsonb_build_object('division_id', x.division_id, 'requests', public.suppress_small_count(x.n)) order by x.division_id)
      from (
        select di.division_id, count(*) as n
        from public.blood_requests br
        join public.districts di on di.id = br.district_id
        where br.created_at >= v_since
        group by di.division_id
      ) x
    ), '[]'::jsonb),
    'top_content', coalesce((
      select jsonb_agg(jsonb_build_object(
        'content_id', x.content_id, 'title_bn', x.title_bn, 'title_en', x.title_en,
        'views', public.suppress_small_count(x.n)) order by x.n desc)
      from (
        select v.content_id, c.title_bn, c.title_en, sum(v.views) as n
        from public.content_view_counts v
        join public.awareness_content c on c.id = v.content_id
        where v.day >= v_since::date
        group by v.content_id, c.title_bn, c.title_en
        order by n desc
        limit 10
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.record_content_view to authenticated;
grant execute on function public.admin_analytics to authenticated;
