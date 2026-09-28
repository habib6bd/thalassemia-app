-- Phase 1a: notifications, push, and the append-only audit log (ARCHITECTURE.md §5.5).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  type text not null,
  entity_type text,
  entity_id uuid,
  -- i18n interpolation params only; never medical data or thalassemia type (D9).
  params jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table public.notification_preferences (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  type text not null,
  push_enabled boolean not null default true,
  primary key (user_id, type)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  row_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
