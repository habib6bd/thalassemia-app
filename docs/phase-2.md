# Phase 2 — Backup Network, Emergency, History, Community, Directory

Start only after Phase 1 is merged and working on a phone. One part per session / PR.
Before starting a part, expand its checklist with the concrete tables, RPCs and
tests, following the Phase 1 level of detail, and update ARCHITECTURE §6.

## 2a — Tiered escalation, broad search, emergency
Master prompt §8, §10, §22.
- [x] Publish invites the `regular` tier only. `process_request_timers()` escalates to `backup` after `regular_response_window_hours` if accepted < units, then allows the manager to "widen search" (`broad`).
- [x] Broad search RPC: donors with `searchable = true`, exact blood group, same district (optionally division), `availability = available`. Returns display name + area + recent-activity bucket only. **No contact data.** Manager sends an invite; the donor sees minimal request info.
- [x] Manager-initiated connection request to a found donor (`initiated_by = patient_side`).
- [x] Emergency requests: `is_emergency` invites regular + backup at once and, optionally, `emergency_available` broad donors. A mandatory disclaimer screen before publishing (not an emergency service, contact hospital / 999 per Q15). Distinct visual status.
- [x] pgTAP: escalation timing, no leakage to non-invited donors, emergency path.

### 2a — concrete plan
Decisions: OPEN_QUESTIONS Q17 (escalation), Q18 (emergency broad), Q19 (search scope). Rules: ARCHITECTURE §7.2 (tiers), §9 (search privacy).

Schema / settings
- [x] `blood_requests.emergency_acknowledged_at timestamptz null`.
- [x] `app_settings.broad_invite_limit = 20`.

RPCs (new migration; old migrations untouched)
- [x] `publish_blood_request(request_id, emergency_acknowledged default false, notify_emergency_donors default false)`: regular tier only for normal requests; emergency needs acknowledgement (`emergency_disclaimer_required`), invites regular + backup, and optionally `emergency_available` donors (→ tier `broad`).
- [x] `process_request_timers()`: after expiry, escalate `regular → backup` (Q17), invite backup connections, notify managers `request_escalated`.
- [x] `widen_request_search(request_id)`: `backup → broad` (idempotent at `broad`; `search_not_available_yet` at `regular`).
- [x] `search_broad_donors(request_id, include_division default false)`: opted-in donors only; returns id, display name, area, district, activity bucket. No contact data. Max 50.
- [x] `invite_broad_donor(request_id, donor_id)`: re-checks eligibility (`donor_not_available`), `already_invited`, `broad_invite_limit_reached`.
- [x] `request_connection_to_donor(patient_id, donor_id, tier)`: `initiated_by = patient_side`; exact blood group; donor searchable or has accepted this patient's request; limit + duplicate checks.
- [x] `respond_connection`: keep the manager's chosen tier when the donor accepts a patient-side request.
- [x] `public_profiles`: managers see display names of donors invited to their requests.

Tests (`supabase/tests/70_escalation_and_search.test.sql`)
- [x] Publish invites regular only; backup not invited.
- [x] Timer: no escalation inside the window while an invite is pending; escalation after the window; early escalation when all regular invites declined; no escalation when enough donors accepted.
- [x] Widen: denied at `regular`, denied to non-managers; allowed at `backup`.
- [x] Search: denied before `broad` and to non-managers; returns only opted-in, same-group, available, same-district donors; returns no contact columns.
- [x] Invite: non-searchable donor rejected; duplicate rejected; donor then sees the request without the patient's name.
- [x] Emergency: publish without acknowledgement rejected; regular + backup invited at once; opted-in emergency donors invited only when asked.
- [x] Patient-side connection: allowed for a searchable donor, denied for a non-searchable one and for non-managers; donor accepts and tier is kept.

App
- [x] Donor profile: "Let families find me in search" switch (fixes `searchable` being reset on save) with a clear consent hint; clearer emergency hint.
- [x] Request wizard: emergency disclaimer screen before publish (not an emergency service, call 999 / contact hospital — Q15), with the opt-in for nearby emergency donors.
- [x] Emergency requests shown distinctly everywhere (icon + text label, not colour alone).
- [x] Request detail: current tier ("regular donors" / "backup donors" / "wider search"), "Widen search" action, link to search.
- [x] Search screen: district/division toggle, results with name, area, activity; "Invite" and "Ask to join network".
- [x] Donor network: donor can accept/decline a family's request to connect.
- [x] `request_escalated` notification + urgent push title for emergency invites; bn/en strings.

## 2b — History, appreciation, guardians, account lifecycle
§12, §20.
- [x] Patient donation history (managers) and donor history with milestones (count-based badges, no ranking of donors against each other).
- [x] `appreciation_messages` (manager → donor, moderated text, optional).
- [x] Guardian invites: an existing manager invites another guardian by code; primary manager can remove guardians; at least one manager must remain.
- [x] Account deletion (Play Store requirement): anonymise the profile, remove contact data and push tokens, keep donation records with the donor shown as "deleted user", end connections. Data export (JSON) of own data.
- [ ] Profile photo (optional): private Storage bucket, size/type limits, signed URLs. **Deferred (Q23).**

### 2b — concrete plan
Decisions: OPEN_QUESTIONS Q20 (thank-you privacy), Q21 (deletion), Q22 (guardian limits), Q23 (photos deferred).

Schema / settings
- [x] `guardian_invites`, `appreciation_messages` (RLS, audit triggers); settings `max_patient_managers`, `guardian_invite_ttl_hours`.
- [x] Deleted profiles can't regain roles (trigger) or edit their profile (policy).

RPCs
- [x] `create_guardian_invite`, `revoke_guardian_invite`, `accept_guardian_invite(code)` (adds the guardian role; errors `invite_invalid`, `already_manager`, `manager_limit_reached`).
- [x] `remove_patient_manager(patient_id, user_id)`: primary removes others, anyone leaves; `last_manager`, `cannot_remove_patient`; primary handed over automatically.
- [x] `get_patient_managers`, `get_patient_donation_history`, `get_my_donation_history`.
- [x] `send_appreciation` (one per donation, 1–300 chars), `hide_appreciation` (recipient), `remove_appreciation` (admin).
- [x] `delete_my_account()` + Edge Function `delete-account` (soft-deletes the auth user); `export_my_data()`.
- [x] Fix: `add_role` failed with an ambiguous column error (new migration).

Tests (`supabase/tests/90_guardians_history_account.test.sql`, 49 checks; allow-list in `80_…`)
- [x] Invites: stranger denied, used/expired/revoked codes rejected, limit, notifications.
- [x] Removal/leave rules and primary hand-over.
- [x] History visibility for managers, donors and strangers; appreciation rules; export contents.
- [x] Deletion: responses/connections closed, request reopened, profile anonymised, roles gone, can't re-add roles or edit profile, sole-manager patient archived and its requests cancelled.

App
- [x] Donor history: total, milestone badges (icon + text), patient name when connected, thank-you message with "hide".
- [x] Patient screen → donation history (with "Say thank you" dialog) and guardians (list, invite code + share, cancel code, remove/leave).
- [x] Patients tab: "Join as guardian with a code".
- [x] Profile: "Download my data" (share sheet / file download on web) and "Delete my account" with confirmation.
- [x] Deleted donors shown as "Deleted user" in request detail and network cards; new notification types routed and translated (bn/en), push titles added.
- [x] Fix: RPC error codes now show their translated message instead of the generic error (`src/lib/errors.ts`).

## 2c — Community & moderation
§11, §28.8, §28.10.
- [ ] `community_posts`, `community_comments` with topics from §11. Every post is shown with a "personal experience, not medical advice" label.
- [ ] Posting requires accepting community guidelines (bn/en page).
- [ ] `reports` (reason: medical misinformation, selling blood, harassment, privacy, spam, other), `user_blocks` (a blocked user's content is hidden both ways, and blocking also blocks connection requests).
- [ ] Moderation: new posts auto-hidden after N reports (setting); admin review queue; hide/restore/remove; audit.
- [ ] No money-related post categories. The report reason "selling blood" is prominent.

## 2d — Verified organization directory + admin basics
§18, §23.
- [ ] `organizations` (type: treatment_centre, hospital, blood_bank, diagnostic_centre, genetic_counselling, support_org), address, district, map coordinates (optional), phone, website, services, hours, `verification_status`, `last_verified_at`, `verified_by`, `verification_method`.
- [ ] **No seeded real organizations.** Admins add them after verification. Only `verified` ones are shown to users, with the "last verified" date.
- [ ] Re-verification reminder (Q14) via a pg_cron job that flags stale entries.
- [ ] Link requests/patients to an organization optionally (keep free text as a fallback).
- [ ] Admin screens (`/admin`, admin role only): users & roles, requests overview, reports queue, organizations & verification, app_settings editor.
