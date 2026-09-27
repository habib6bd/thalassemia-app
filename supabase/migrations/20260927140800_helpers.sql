-- Phase 1a: authorization helper functions (ARCHITECTURE.md §8).
-- `security definer` + `set search_path = ''` so RLS policies can call them
-- without granting policy authors direct table access, per D2/D3.

create function public.has_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = target_role
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

create function public.is_patient_manager(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_managers pm
    where pm.patient_id = target_patient_id
      and pm.user_id = auth.uid()
  );
$$;

-- Active/paused connections still count (§7.1: paused donors stay "connected").
create function public.is_connected_donor(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_donor_connections c
    where c.patient_id = target_patient_id
      and c.donor_id = auth.uid()
      and c.status in ('active', 'paused')
  );
$$;

-- A donor who declined can no longer see the request (§9); an invite the
-- donor accepted, withdrew from, or that the request-lifecycle closed
-- remains visible so the donor keeps their own history.
create function public.is_invited_donor(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.donor_responses dr
    where dr.request_id = target_request_id
      and dr.donor_id = auth.uid()
      and dr.status <> 'declined'
  );
$$;

-- True once two users share an active or paused connection (either
-- direction of manager/donor), gating the public_profiles view (§8).
create function public.shares_active_connection(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_donor_connections c
    join public.patient_managers pm on pm.patient_id = c.patient_id
    where c.status in ('active', 'paused')
      and (
        (c.donor_id = auth.uid() and pm.user_id = other_user_id)
        or (c.donor_id = other_user_id and pm.user_id = auth.uid())
      )
  );
$$;
