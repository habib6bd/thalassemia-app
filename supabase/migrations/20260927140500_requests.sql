-- Phase 1a: blood requests, donor responses, donations (ARCHITECTURE.md §5.4).

create table public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  created_by uuid not null references public.profiles (user_id),
  blood_group public.blood_group not null,
  component text,
  units_needed smallint not null check (units_needed between 1 and 10),
  required_at timestamptz not null,
  treating_centre text not null,
  district_id int not null references public.districts (id),
  area text,
  is_emergency boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 500),
  status public.request_status not null default 'draft',
  current_tier public.request_tier not null default 'regular',
  tier_changed_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.blood_requests
  for each row execute function public.set_updated_at();

-- `required_at::date` isn't IMMUTABLE (depends on the session timezone), so
-- index expressions need a fixed-offset wrapper. Bangladesh has one timezone
-- (Asia/Dhaka, UTC+6, no DST), so this is stable in practice.
create function public.bd_date(ts timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (ts at time zone 'Asia/Dhaka')::date
$$;

-- One non-terminal request per patient per required-at day (ARCHITECTURE.md
-- §5.4); RPCs surface a violation as the `duplicate_request` error code.
create unique index blood_requests_duplicate_guard
  on public.blood_requests (patient_id, public.bd_date(required_at))
  where status in ('draft', 'open', 'responding', 'partially_fulfilled');

create table public.donor_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests (id) on delete cascade,
  donor_id uuid not null references public.donor_profiles (user_id) on delete cascade,
  invited_via public.request_tier not null,
  status public.response_status not null default 'invited',
  scheduled_at timestamptz,
  donor_reported_donated_at timestamptz,
  responded_at timestamptz,
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references public.profiles (user_id),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, donor_id)
);

create trigger set_updated_at
  before update on public.donor_responses
  for each row execute function public.set_updated_at();

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.donor_responses (id),
  request_id uuid not null references public.blood_requests (id),
  patient_id uuid not null references public.patients (id),
  donor_id uuid not null references public.donor_profiles (user_id),
  donated_on date not null,
  verification public.donation_verification not null,
  confirmed_by uuid not null references public.profiles (user_id),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
