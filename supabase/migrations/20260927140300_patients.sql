-- Phase 1a: patients & their managers (ARCHITECTURE.md §5.2).

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) <= 80),
  blood_group public.blood_group not null,
  thalassemia_type text,
  treating_centre text,
  district_id int not null references public.districts (id),
  area text,
  next_transfusion_date date,
  invite_code text not null unique,
  show_treating_centre boolean not null default true,
  show_area boolean not null default true,
  show_next_transfusion boolean not null default true,
  show_thalassemia_type boolean not null default false,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create trigger set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

create table public.patient_managers (
  patient_id uuid not null references public.patients (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  relation public.manager_relation not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (patient_id, user_id)
);

-- At most one 'self' manager per patient.
create unique index patient_managers_one_self
  on public.patient_managers (patient_id)
  where relation = 'self';
