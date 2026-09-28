-- Phase 4c: opt-in nearby donor search, availability and transfusion
-- reminders (phase-3-4.md 4c, ARCHITECTURE §6/§9/§11, OPEN_QUESTIONS Q42–Q45).
--
-- Location is opt-in and approximate: a donor may share a point rounded to
-- 2 decimals (~1 km), stored in its own owner-only table (never on
-- donor_profiles, which connected families can read). Managers never see
-- coordinates or exact distances, only a distance band. The request's
-- location is its linked verified organization (2d).
--
-- Reminders never say anyone is eligible (§2): they ask the donor to update
-- their own availability and to check with a doctor or blood bank.

insert into public.app_settings (key, value, description) values
  ('nearby_search_max_km', '50', 'Largest radius (km) for opt-in nearby donor search.'),
  ('transfusion_reminder_days', '3', 'Days before a patient''s next transfusion date that managers get a reminder (only if no request covers it).')
on conflict (key) do nothing;

-- === donor locations (owner-only) ============================================
create table public.donor_locations (
  user_id uuid primary key references public.donor_profiles (user_id) on delete cascade,
  latitude numeric(5, 2) not null check (latitude between -90 and 90),
  longitude numeric(5, 2) not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.donor_locations enable row level security;
revoke all on public.donor_locations from public, anon, authenticated;
grant select on public.donor_locations to authenticated;

create policy donor_locations_select_own on public.donor_locations
  for select to authenticated
  using (user_id = auth.uid());

create trigger audit_row_change after insert or update or delete on public.donor_locations
  for each row execute function public.audit_row_change();

-- Pass nulls to stop sharing (the row is deleted).
create function public.set_donor_location(latitude numeric, longitude numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.donor_profiles d where d.user_id = auth.uid()) then
    raise exception using errcode = 'P0001', message = 'donor_profile_required';
  end if;

  if set_donor_location.latitude is null or set_donor_location.longitude is null then
    delete from public.donor_locations where user_id = auth.uid();
    return;
  end if;

  if set_donor_location.latitude not between -90 and 90
     or set_donor_location.longitude not between -180 and 180 then
    raise exception using errcode = 'P0001', message = 'invalid_location';
  end if;

  insert into public.donor_locations (user_id, latitude, longitude, updated_at)
  values (auth.uid(), round(set_donor_location.latitude, 2), round(set_donor_location.longitude, 2), now())
  on conflict on constraint donor_locations_pkey do update
    set latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
end;
$$;

-- Great-circle distance in km (no PostGIS needed at this scale).
create function public.distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
    + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
      * power(sin(radians((lng2 - lng1)::double precision) / 2), 2)
  ));
$$;

-- Distance from the request's verified organization to the donor's shared
-- point, or null when either is unknown.
create function public.request_donor_distance_km(p_request public.blood_requests, p_donor_id uuid)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select public.distance_km(o.latitude, o.longitude, l.latitude, l.longitude)
  from public.organizations o
  join public.donor_locations l on l.user_id = p_donor_id
  where o.id = p_request.organization_id
    and o.verification_status = 'verified'
    and o.latitude is not null and o.longitude is not null;
$$;

-- Same rules as Phase 2a, plus: a donor within nearby_search_max_km of the
-- request's organization counts as reachable for broad search/invites, and
-- nobody is offered to (or invited by) someone they blocked or who blocked
-- them (closes the gap noted in Q27).
create or replace function public.is_broad_eligible_donor(
  p_request public.blood_requests,
  p_donor_id uuid,
  p_emergency boolean,
  p_include_division boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.donor_profiles dp
    join public.profiles pr on pr.user_id = dp.user_id
    where dp.user_id = p_donor_id
      and case when p_emergency then dp.emergency_available else dp.searchable end
      and dp.blood_group = p_request.blood_group
      and dp.availability = 'available'
      and pr.deleted_at is null
      and not public.is_blocked_between(p_donor_id)
      and (
        pr.district_id = p_request.district_id
        or (
          p_include_division
          and exists (
            select 1
            from public.districts mine
            join public.districts theirs on theirs.division_id = mine.division_id
            where mine.id = p_request.district_id and theirs.id = pr.district_id
          )
        )
        or (
          not p_emergency
          and p_include_division
          and public.request_donor_distance_km(p_request, p_donor_id) <= coalesce(
            (select (value #>> '{}')::int from public.app_settings where key = 'nearby_search_max_km'), 50
          )
        )
      )
      and not exists (
        select 1 from public.patient_managers pm
        where pm.patient_id = p_request.patient_id and pm.user_id = dp.user_id
      )
  );
$$;

-- Manager-only, same gates as search_broad_donors. Returns a distance band,
-- never coordinates or an exact distance.
create function public.search_nearby_donors(request_id uuid, radius_km int default 25)
returns table (
  donor_id uuid,
  display_name text,
  area text,
  district_id int,
  distance_band text,
  activity text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_request public.blood_requests;
  v_max int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'nearby_search_max_km'), 50);
  v_radius int;
begin
  select * into v_request from public.blood_requests br where br.id = search_nearby_donors.request_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if not public.is_patient_manager(v_request.patient_id) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if v_request.status not in ('open', 'responding', 'partially_fulfilled') then
    raise exception using errcode = 'P0001', message = 'invalid_transition';
  end if;

  if v_request.current_tier <> 'broad' then
    raise exception using errcode = 'P0001', message = 'search_not_available_yet';
  end if;

  if not exists (
    select 1 from public.organizations o
    where o.id = v_request.organization_id and o.verification_status = 'verified'
      and o.latitude is not null and o.longitude is not null
  ) then
    raise exception using errcode = 'P0001', message = 'request_location_unknown';
  end if;

  v_radius := least(greatest(coalesce(search_nearby_donors.radius_km, 25), 1), v_max);

  return query
  select
    x.user_id, x.display_name, x.area, x.district_id,
    case
      when x.km < 5 then 'under_5'
      when x.km < 10 then 'under_10'
      when x.km < 25 then 'under_25'
      else 'under_50'
    end,
    case
      when x.last_active >= now() - interval '7 days' then 'week'
      when x.last_active >= now() - interval '30 days' then 'month'
      else 'older'
    end
  from (
    select dp.user_id, pr.display_name, pr.area, pr.district_id,
      public.request_donor_distance_km(v_request, dp.user_id) as km,
      greatest(dp.updated_at, (select max(dr.responded_at) from public.donor_responses dr where dr.donor_id = dp.user_id)) as last_active
    from public.donor_profiles dp
    join public.profiles pr on pr.user_id = dp.user_id
    join public.donor_locations l on l.user_id = dp.user_id
    where dp.user_id <> auth.uid()
      and public.is_broad_eligible_donor(v_request, dp.user_id, false, true)
      and not exists (
        select 1 from public.donor_responses dr
        where dr.request_id = v_request.id and dr.donor_id = dp.user_id
      )
  ) x
  where x.km <= v_radius
  order by x.km, x.last_active desc
  limit 50;
end;
$$;

-- === reminders ===============================================================
alter table public.donor_profiles
  add column availability_reminders boolean not null default true,
  add column availability_reminded_at timestamptz;
grant update (availability_reminders) on public.donor_profiles to authenticated;

alter table public.patients add column transfusion_reminded_for date;

-- Internal (pg_cron, daily). Two kinds of nudge, each sent once per cycle:
-- 1. donor: `donation_reminder_days` after the last recorded donation, or
--    when the donor's own "available from" date arrives while unavailable;
-- 2. managers: `transfusion_reminder_days` before the patient's next
--    transfusion date, unless a live request already covers that date.
create function public.process_daily_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := public.bd_date(now());
  v_donation_days int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'donation_reminder_days'), 120);
  v_transfusion_days int := coalesce((select (value #>> '{}')::int from public.app_settings where key = 'transfusion_reminder_days'), 3);
  v_row record;
begin
  for v_row in
    select dp.user_id,
      case
        when dp.availability = 'unavailable' and dp.available_from is not null and dp.available_from <= v_today
          and (dp.availability_reminded_at is null or public.bd_date(dp.availability_reminded_at) < dp.available_from)
          then 'available_from_reached'
        else 'since_last_donation'
      end as reason
    from public.donor_profiles dp
    join public.profiles pr on pr.user_id = dp.user_id
    where dp.availability_reminders
      and pr.deleted_at is null
      and (
        (dp.availability = 'unavailable' and dp.available_from is not null and dp.available_from <= v_today
          and (dp.availability_reminded_at is null or public.bd_date(dp.availability_reminded_at) < dp.available_from))
        or (dp.last_donation_date is not null
          and dp.last_donation_date + v_donation_days <= v_today
          and (dp.availability_reminded_at is null
               or public.bd_date(dp.availability_reminded_at) < dp.last_donation_date + v_donation_days))
      )
    for update of dp skip locked
  loop
    update public.donor_profiles set availability_reminded_at = now() where user_id = v_row.user_id;
    perform public.enqueue_notification(
      v_row.user_id, 'availability_check_in', 'donor_profile', v_row.user_id,
      jsonb_build_object('reason', v_row.reason, 'days', v_donation_days)
    );
  end loop;

  for v_row in
    select p.id, p.next_transfusion_date
    from public.patients p
    where p.archived_at is null
      and p.next_transfusion_date is not null
      and p.next_transfusion_date >= v_today
      and p.next_transfusion_date <= v_today + v_transfusion_days
      and p.transfusion_reminded_for is distinct from p.next_transfusion_date
      and not exists (
        select 1 from public.blood_requests br
        where br.patient_id = p.id
          and br.status in ('draft', 'open', 'responding', 'partially_fulfilled', 'fulfilled')
          and public.bd_date(br.required_at) between p.next_transfusion_date - 2 and p.next_transfusion_date
      )
    for update of p skip locked
  loop
    update public.patients set transfusion_reminded_for = v_row.next_transfusion_date where id = v_row.id;
    perform public.enqueue_notification(
      pm.user_id, 'transfusion_upcoming', 'patient_request', v_row.id,
      jsonb_build_object('date', v_row.next_transfusion_date)
    )
    from public.patient_managers pm
    where pm.patient_id = v_row.id;
  end loop;
end;
$$;

select cron.schedule(
  'process-daily-reminders',
  '41 3 * * *',
  $$select public.process_daily_reminders()$$
);

-- Account deletion removes the shared location (Q21).
create function public.location_cleanup_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.donor_locations where user_id = new.user_id;
  update public.donor_profiles set availability_reminders = false where user_id = new.user_id;
  return new;
end;
$$;

create trigger location_cleanup_on_profile_delete
  after update of deleted_at on public.profiles
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.location_cleanup_on_profile_delete();

grant execute on function public.set_donor_location to authenticated;
grant execute on function public.search_nearby_donors to authenticated;
