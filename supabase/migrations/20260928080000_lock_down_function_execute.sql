-- Security fix: close EXECUTE on internal functions for anon/authenticated.
--
-- 20260927141900_execute_grants.sql tried to default-deny with
--   revoke execute on all functions in schema public from public;
--   alter default privileges in schema public revoke execute on functions from public;
-- That left two holes:
--   1. Supabase grants EXECUTE on every function in `public` to anon,
--      authenticated and service_role *directly* (its own default
--      privileges), not via PUBLIC, so revoking from PUBLIC removed nothing
--      for those roles. Internal helpers such as enqueue_notification,
--      write_audit and recompute_request_status were callable through
--      PostgREST by any client, even without signing in.
--   2. A per-schema `alter default privileges ... revoke` cannot take away
--      the global default (EXECUTE to PUBLIC), so it was a no-op; functions
--      created afterwards were executable by PUBLIC again.
--
-- Fix: revoke from all three roles, fix the defaults at both levels, then
-- grant `authenticated` exactly the allow-list below. anon gets nothing.
-- supabase/tests/80_function_privileges.test.sql pins the allow-list.

revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- RLS/view helpers evaluated as the querying role.
grant execute on function public.has_role to authenticated;
grant execute on function public.is_admin to authenticated;
grant execute on function public.is_patient_manager to authenticated;
grant execute on function public.manages_connected_donor to authenticated;
grant execute on function public.is_connected_donor to authenticated;
grant execute on function public.is_invited_donor to authenticated;
grant execute on function public.shares_active_connection to authenticated;

-- Client RPCs (each re-checks auth.uid() and authorization itself).
grant execute on function public.complete_onboarding to authenticated;
grant execute on function public.add_role to authenticated;
grant execute on function public.upsert_donor_profile to authenticated;
grant execute on function public.create_patient to authenticated;
grant execute on function public.update_patient to authenticated;
grant execute on function public.rotate_invite_code to authenticated;
grant execute on function public.request_connection_by_code to authenticated;
grant execute on function public.respond_connection to authenticated;
grant execute on function public.cancel_connection_request to authenticated;
grant execute on function public.set_connection_status to authenticated;
grant execute on function public.set_connection_tier to authenticated;
grant execute on function public.get_connection_parties to authenticated;
grant execute on function public.create_blood_request to authenticated;
grant execute on function public.update_blood_request to authenticated;
grant execute on function public.publish_blood_request to authenticated;
grant execute on function public.cancel_blood_request to authenticated;
grant execute on function public.get_request_for_donor to authenticated;
grant execute on function public.respond_to_request to authenticated;
grant execute on function public.schedule_donation to authenticated;
grant execute on function public.withdraw_response to authenticated;
grant execute on function public.report_donated to authenticated;
grant execute on function public.confirm_donation to authenticated;
grant execute on function public.get_response_contact to authenticated;
grant execute on function public.mark_notification_read to authenticated;
grant execute on function public.mark_all_notifications_read to authenticated;
grant execute on function public.register_push_token to authenticated;

-- Everything else stays private: trigger functions (set_updated_at,
-- audit_row_change, handle_new_auth_user, sync_last_donation_date), the
-- index helper bd_date, and helpers only called from inside other
-- security definer functions (write_audit, enqueue_notification,
-- generate_invite_code, recompute_request_status, process_request_timers).
