-- Phase 1a: identity & roles, and location reference data (ARCHITECTURE.md §5.1).

create table public.divisions (
  id int primary key,
  name_bn text not null,
  name_en text not null
);

create table public.districts (
  id int primary key,
  division_id int not null references public.divisions (id),
  name_bn text not null,
  name_en text not null
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  preferred_contact public.contact_method not null default 'phone',
  share_contact_on_accept boolean not null default false,
  language text not null default 'bn' check (language in ('bn', 'en')),
  district_id int references public.districts (id),
  area text check (area is null or char_length(area) <= 120),
  onboarded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (user_id)
);

create trigger set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Creates a `profiles` row for every new auth user (ARCHITECTURE.md §5.1);
-- display_name falls back to the email's local part when no metadata is set.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1),
      'User'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
