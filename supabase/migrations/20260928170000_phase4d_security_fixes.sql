-- Phase 4d security review fix (docs/SECURITY_PRIVACY.md, finding SR-1).
--
-- public_profiles and patient_cards_for_donor are definer-rights views
-- (security_invoker = false) so they can show a filtered slice of tables the
-- caller can't read directly. Postgres makes simple views auto-updatable, and
-- Supabase's default privileges had granted INSERT/UPDATE/DELETE on them to
-- `authenticated` (and everything to `anon`). A write through such a view
-- runs with the view owner's rights, bypassing RLS: a guardian could rename
-- a connected donor, and a connected donor could overwrite the patient's
-- name, thalassemia type or treating centre.
--
-- Views are read-only for clients. supabase/tests/05_security_invariants
-- pins this for every current and future view.

revoke all on public.public_profiles from anon, authenticated;
revoke all on public.patient_cards_for_donor from anon, authenticated;
grant select on public.public_profiles to authenticated;
grant select on public.patient_cards_for_donor to authenticated;

-- New objects created in `public` by migrations must not become writable
-- by clients through Supabase's default table privileges.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;
