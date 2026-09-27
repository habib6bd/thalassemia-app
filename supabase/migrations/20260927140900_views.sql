-- Phase 1a: views (ARCHITECTURE.md §8-§9).
--
-- Both views are owned by the migration role and run with the *owner's*
-- privileges (Postgres default: `security_invoker = false`), so they bypass
-- the base tables' RLS and enforce their own row/column visibility instead.
-- This is what lets `public_profiles` reveal only `display_name` (never
-- `phone`) and `patient_cards_for_donor` mask fields by the patient's
-- `show_*` flags — restrictions RLS alone (row-level, not column-level)
-- can't express. The base tables' own RLS policies (next migration) do NOT
-- grant these cross-user cases directly, so this view is the only path to
-- them.

create view public.public_profiles
with (security_invoker = false)
as
select p.user_id, p.display_name
from public.profiles p
where p.user_id = auth.uid()
   or public.is_admin()
   or public.shares_active_connection(p.user_id);

create view public.patient_cards_for_donor
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  p.blood_group,
  p.district_id,
  case
    when public.is_patient_manager(p.id) or public.is_admin() or p.show_area
      then p.area
  end as area,
  case
    when public.is_patient_manager(p.id) or public.is_admin() or p.show_treating_centre
      then p.treating_centre
  end as treating_centre,
  case
    when public.is_patient_manager(p.id) or public.is_admin() or p.show_next_transfusion
      then p.next_transfusion_date
  end as next_transfusion_date,
  case
    when public.is_patient_manager(p.id) or public.is_admin() or p.show_thalassemia_type
      then p.thalassemia_type
  end as thalassemia_type
from public.patients p
where public.is_connected_donor(p.id)
   or public.is_patient_manager(p.id)
   or public.is_admin();

grant select on public.public_profiles to authenticated;
grant select on public.patient_cards_for_donor to authenticated;
