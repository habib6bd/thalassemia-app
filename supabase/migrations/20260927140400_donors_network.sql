-- Phase 1a: donor profiles & patient-donor connections (ARCHITECTURE.md §5.3).

create table public.donor_profiles (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  blood_group public.blood_group not null,
  availability public.donor_availability not null default 'available',
  available_from date,
  last_donation_date date,
  emergency_available boolean not null default false,
  searchable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.donor_profiles
  for each row execute function public.set_updated_at();

create table public.patient_donor_connections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  donor_id uuid not null references public.donor_profiles (user_id) on delete cascade,
  tier public.connection_tier not null default 'regular',
  status public.connection_status not null default 'requested',
  initiated_by public.connection_initiator not null,
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references public.profiles (user_id),
  end_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.patient_donor_connections
  for each row execute function public.set_updated_at();

-- Only one non-terminal (requested/active/paused) connection per patient-donor pair.
create unique index patient_donor_connections_active_unique
  on public.patient_donor_connections (patient_id, donor_id)
  where status in ('requested', 'active', 'paused');
