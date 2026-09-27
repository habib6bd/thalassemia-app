-- Phase 1a: lock down function EXECUTE privileges (D2/D3).
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, which
-- would let any authenticated user call our internal helpers (write_audit,
-- enqueue_notification, recompute_request_status, process_request_timers,
-- trigger functions, ...) directly via PostgREST — bypassing the
-- authorization checks those functions assume their caller already made.
-- Default-deny, then allow-list exactly what the app and RLS need.

revoke execute on all functions in schema public from public;
alter default privileges in schema public revoke execute on functions from public;

-- RLS helpers actually evaluated as the querying role (called directly from
-- a policy's USING/WITH CHECK), so `authenticated` needs EXECUTE on these.
grant execute on function public.has_role to authenticated;
grant execute on function public.is_admin to authenticated;
grant execute on function public.is_patient_manager to authenticated;
grant execute on function public.manages_connected_donor to authenticated;

-- Also needed by `authenticated`: a view's "runs as owner" treatment
-- (§ table SELECT/RLS) does NOT extend to EXECUTE-privilege checks on
-- functions called inside the view's query — those are still checked
-- against the actual querying role. `patient_cards_for_donor` calls
-- is_connected_donor directly, so `authenticated` needs EXECUTE here even
-- though the view itself runs with the view owner's table access.
grant execute on function public.is_connected_donor to authenticated;
grant execute on function public.is_invited_donor to authenticated;
grant execute on function public.shares_active_connection to authenticated;

-- Client-callable RPCs (phase-1.md 1a checklist).
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
grant execute on function public.mark_notification_read to authenticated;
grant execute on function public.mark_all_notifications_read to authenticated;
grant execute on function public.register_push_token to authenticated;

-- Everything else (set_updated_at, handle_new_auth_user, bd_date,
-- write_audit, enqueue_notification, generate_invite_code, audit_row_change,
-- sync_last_donation_date, is_connected_donor, is_invited_donor,
-- shares_active_connection, recompute_request_status,
-- process_request_timers) stays un-granted to `authenticated`/`anon`: they
-- either run as trigger functions (no grant needed) or are only ever called
-- from inside another `security definer` function, which runs with the
-- function owner's privileges regardless of the original caller's grants.
