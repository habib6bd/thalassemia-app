-- Phase 1a: Row Level Security for every table (ARCHITECTURE.md §8, D3).
--
-- Pattern: default-deny. Every table gets `enable row level security`, an
-- explicit `revoke all ... from public, anon, authenticated` (so we never
-- rely on a platform's default grants), then exactly the grants + policies
-- the §8 matrix calls for. Tables D3 marks "RPC only" get NO insert/update/
-- delete grant to `authenticated` at all — only `security definer` RPCs
-- (owned by a role with real table privileges) can write them.

-- One more helper: a manager viewing a donor's profile through a shared
-- connection (the mirror image of is_connected_donor).
create function public.manages_connected_donor(target_donor_id uuid)
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
    where c.donor_id = target_donor_id
      and pm.user_id = auth.uid()
      and c.status in ('active', 'paused')
  );
$$;

-- === profiles ===============================================================
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  display_name, phone, preferred_contact, share_contact_on_accept,
  language, district_id, area, onboarded_at
) on public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- === user_roles (RPC only) ==================================================
alter table public.user_roles enable row level security;
revoke all on public.user_roles from public, anon, authenticated;
grant select on public.user_roles to authenticated;

create policy user_roles_select_own_or_admin on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- === divisions / districts (read-only reference data) ======================
alter table public.divisions enable row level security;
alter table public.districts enable row level security;
revoke all on public.divisions from public, anon, authenticated;
revoke all on public.districts from public, anon, authenticated;
grant select on public.divisions to authenticated;
grant select on public.districts to authenticated;

create policy divisions_select_all on public.divisions
  for select to authenticated using (true);

create policy districts_select_all on public.districts
  for select to authenticated using (true);

-- === app_settings (admin RPC writes) ========================================
alter table public.app_settings enable row level security;
revoke all on public.app_settings from public, anon, authenticated;
grant select on public.app_settings to authenticated;

create policy app_settings_select_all on public.app_settings
  for select to authenticated using (true);

-- === patients (RPC-only writes; direct select for managers/admin) ==========
alter table public.patients enable row level security;
revoke all on public.patients from public, anon, authenticated;
grant select on public.patients to authenticated;

create policy patients_select_managers_or_admin on public.patients
  for select to authenticated
  using (public.is_patient_manager(id) or public.is_admin());

-- === patient_managers (RPC only) ============================================
alter table public.patient_managers enable row level security;
revoke all on public.patient_managers from public, anon, authenticated;
grant select on public.patient_managers to authenticated;

create policy patient_managers_select_same_patient on public.patient_managers
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_patient_manager(patient_id)
    or public.is_admin()
  );

-- === donor_profiles (direct own-row writes; last_donation_date is trigger-only) ===
alter table public.donor_profiles enable row level security;
revoke all on public.donor_profiles from public, anon, authenticated;
grant select, insert on public.donor_profiles to authenticated;
grant update (
  blood_group, availability, available_from, emergency_available, searchable
) on public.donor_profiles to authenticated;

create policy donor_profiles_select on public.donor_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.manages_connected_donor(user_id)
  );

create policy donor_profiles_insert_own on public.donor_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_role('donor'));

create policy donor_profiles_update_own on public.donor_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- === patient_donor_connections (RPC only) ===================================
alter table public.patient_donor_connections enable row level security;
revoke all on public.patient_donor_connections from public, anon, authenticated;
grant select on public.patient_donor_connections to authenticated;

create policy connections_select_party on public.patient_donor_connections
  for select to authenticated
  using (
    donor_id = auth.uid()
    or public.is_patient_manager(patient_id)
    or public.is_admin()
  );

-- === blood_requests (RPC only; donors never see this table directly) =======
alter table public.blood_requests enable row level security;
revoke all on public.blood_requests from public, anon, authenticated;
grant select on public.blood_requests to authenticated;

create policy blood_requests_select_managers_or_admin on public.blood_requests
  for select to authenticated
  using (public.is_patient_manager(patient_id) or public.is_admin());

-- === donor_responses (RPC only) =============================================
alter table public.donor_responses enable row level security;
revoke all on public.donor_responses from public, anon, authenticated;
grant select on public.donor_responses to authenticated;

create policy donor_responses_select_party on public.donor_responses
  for select to authenticated
  using (
    donor_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.blood_requests br
      where br.id = donor_responses.request_id
        and public.is_patient_manager(br.patient_id)
    )
  );

-- === donations (RPC only) ===================================================
alter table public.donations enable row level security;
revoke all on public.donations from public, anon, authenticated;
grant select on public.donations to authenticated;

create policy donations_select_party on public.donations
  for select to authenticated
  using (
    donor_id = auth.uid()
    or public.is_admin()
    or public.is_patient_manager(patient_id)
  );

-- === notifications (own; writes via RPC only) ===============================
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- === push_tokens / notification_preferences (own, direct CRUD) =============
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

create policy push_tokens_own on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- === audit_logs (admin read-only; writes via triggers only) ================
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());
