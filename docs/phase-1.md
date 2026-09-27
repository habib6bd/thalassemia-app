# Phase 1 — Core Donor-Request Workflow (MVP)

Split into 4 parts. **One part per session / PR.** Do them in order.
Read first: `CLAUDE.md` and the ARCHITECTURE sections listed per part.

Scope (master prompt §25 Phase 1): auth, patient/guardian/donor profiles,
blood group, location, patient–donor connection, blood request,
accept/decline, completion, notifications.

---

## 1a — Database: schema, RLS, RPCs, tests

Read: ARCHITECTURE §2–§9, §11, §13.

- [x] Migrations for all Phase 1 tables/enums in ARCHITECTURE §4–§5, with FKs, checks, partial unique indexes, `updated_at` triggers.
- [x] Seed migration: 8 divisions and 64 districts (bn + en names). Use the official Bangladesh Bureau of Statistics list; add a comment naming the source. Seed `app_settings`.
- [x] Trigger on `auth.users` insert → create `profiles` row (display_name from metadata or email prefix).
- [x] Helper functions (ARCHITECTURE §8).
- [x] RLS policies for every table, per the §8 matrix. Revoke direct writes on the stateful tables (D3).
- [x] Views: `public_profiles`, `patient_cards_for_donor`.
- [x] RPCs (all `security definer`, `search_path=''`, auth check, row lock, audit, notifications):
  - `complete_onboarding(roles app_role[], display_name, phone, district_id, area, language, share_contact_on_accept)`: only patient/guardian/donor roles are allowed
  - `add_role(role)` (self-service for patient/guardian/donor only)
  - `upsert_donor_profile(...)`
  - `create_patient(...)` → patient + manager row (`self` if caller has the patient role and chooses self, else `guardian`) + invite code
  - `update_patient(patient_id, ...)`, `rotate_invite_code(patient_id)`
  - `request_connection_by_code(invite_code)` (donor → `requested`, initiated_by donor)
  - `respond_connection(connection_id, accept bool, tier)`: only the non-initiating side can call it
  - `cancel_connection_request(connection_id)`: initiator only
  - `set_connection_status(connection_id, 'paused'|'active'|'removed', reason)`
  - `set_connection_tier(connection_id, tier)`: patient side only
  - `create_blood_request(...)` (draft), `update_blood_request(...)` (draft only), `publish_blood_request(id)`, `cancel_blood_request(id, reason)`
  - `get_request_for_donor(request_id)`: minimal fields (ARCHITECTURE §9)
  - `respond_to_request(response_id, accept bool, reason)`, `schedule_donation(response_id, scheduled_at)`, `withdraw_response(response_id, reason)`, `report_donated(response_id)`, `confirm_donation(response_id, donated_on)`
  - `recompute_request_status(request_id)` (internal, not granted to clients)
  - `process_request_timers()` + pg_cron schedule (expiry only in Phase 1)
  - `mark_notification_read(id)`, `mark_all_notifications_read()`, `register_push_token(token, platform)`
- [x] Phase 1 invitations: on publish, invite **all active connections** whose donor has an exact blood-group match and `availability <> 'paused'`. Tiered escalation comes in Phase 2.
- [x] Audit triggers on: patients, patient_managers, donor_profiles, patient_donor_connections, blood_requests, donor_responses, donations, user_roles.
- [x] pgTAP tests, at minimum:
  - RLS allow/deny for every row in ARCHITECTURE §8 (stranger, donor, other donor, manager, other manager, admin).
  - Every valid transition, plus invalid ones rejected with `invalid_transition`.
  - Connection limit (7th → `donor_limit_reached`); duplicate active connection rejected.
  - Accept does **not** create a donation. Only `confirm_donation` does, and only a manager can call it.
  - Partial and full fulfilment recompute; fulfil/cancel/expire cascades to responses.
  - Duplicate request for the same patient and day → `duplicate_request`.
  - Donor active-commitment conflict (`donor_has_active_commitment`).
  - Removed/declined donor can't see the request or the patient anymore.
  - Direct `update` on stateful tables by `authenticated` fails.
  - Notifications created for each event; no notification params contain thalassemia type or phone.
- [x] Regenerate `src/lib/database.types.ts`.

## 1b — App: auth, onboarding, profiles, network

Read: ARCHITECTURE §8, §9, §12.

- [x] Auth screens: sign up, sign in, email verification notice, forgot password, sign out. Session in Zustand; route guards (unauthenticated → auth, not onboarded → onboarding).
- [x] Onboarding: choose role(s) (patient / guardian / donor, multiple allowed), name, phone (optional), district picker (bn/en), area, language, contact-sharing consent (clear explanation).
- [x] Donor profile screen: blood group, availability, available_from, emergency availability. Show the fixed disclaimer: "রক্তদানের যোগ্যতা ব্লাড ব্যাংক/চিকিৎসক নির্ধারণ করবেন" (eligibility is decided by the blood bank), with an English equivalent.
- [x] Patient screens (manager): create/edit patient, visibility toggles with plain-language explanations, list of my patients.
- [x] Network: manager shares invite code (share sheet with a WhatsApp-friendly text), donor enters code, manager approves (chooses regular/backup), both sides see connection list with status, pause/resume/remove/leave with confirmation dialogs. Limit reached → friendly message.
- [x] Role switcher for users with several roles; home primary action per ARCHITECTURE §12.
- [x] All strings in `bn` + `en` locale files. Jest tests for schemas and key components.

## 1c — App: blood requests & donations

Read: ARCHITECTURE §7, §9.

- [x] Manager: "Request Blood" flow in at most 3 short steps (patient → date/time + centre + units → review and publish). Blood group pre-filled from patient. Component is optional free text (Q5).
- [x] Request detail (manager): status chip, timeline, list of donor responses (status, scheduled time, contact if shared), actions: cancel, confirm donation (date picker, confirmation dialog that says what it means).
- [x] Donor inbox: invited/active requests with minimal info; accept / decline (no reason required, no penalty text); schedule; withdraw; "I donated" (explains that the family will confirm).
- [x] Clear wording that separates **"I can donate"** from **"donation completed"** everywhere.
- [x] Donation history (donor): list of confirmed donations. Last donation date on the donor profile, shown only as information.
- [x] Error codes mapped to friendly bn/en messages.

## 1d — Notifications

Read: ARCHITECTURE §10.

- [ ] In-app notifications screen + unread badge; tapping deep-links to the entity.
- [ ] Push: permission prompt at a sensible moment (not at first launch), `register_push_token`, handle token refresh.
- [ ] Edge Function `supabase/functions/send-push`: webhook secret check, preferences, Expo Push API, `pushed_at`, invalid-token cleanup. `deno test` for payload building. Payload text is generic (D9).
- [ ] Webhook config documented in README (how to create the Database Webhook in the dashboard and set `PUSH_WEBHOOK_SECRET`).
- [ ] Notification preferences screen (per type on/off; in-app always on).
- [ ] Document that push needs an EAS development build (Expo Go can't receive remote push on Android).

## Phase 1 done when

A guardian creates a patient, a donor joins via code, the guardian publishes a
request, the donor accepts, the guardian confirms the donation, the request
becomes `fulfilled`, and both sides get notifications. All tests pass in CI.
