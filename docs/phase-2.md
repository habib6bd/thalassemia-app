# Phase 2 — Backup Network, Emergency, History, Community, Directory

Start only after Phase 1 is merged and working on a phone. One part per session / PR.
Before starting a part, expand its checklist with the concrete tables, RPCs and
tests, following the Phase 1 level of detail, and update ARCHITECTURE §6.

## 2a — Tiered escalation, broad search, emergency
Master prompt §8, §10, §22.
- [ ] Publish invites the `regular` tier only. `process_request_timers()` escalates to `backup` after `regular_response_window_hours` if accepted < units, then allows the manager to "widen search" (`broad`).
- [ ] Broad search RPC: donors with `searchable = true`, exact blood group, same district (optionally division), `availability = available`. Returns display name + area + recent-activity bucket only. **No contact data.** Manager sends an invite; the donor sees minimal request info.
- [ ] Manager-initiated connection request to a found donor (`initiated_by = patient_side`).
- [ ] Emergency requests: `is_emergency` invites regular + backup at once and, optionally, `emergency_available` broad donors. A mandatory disclaimer screen before publishing (not an emergency service, contact hospital / 999 per Q15). Distinct visual status.
- [ ] pgTAP: escalation timing, no leakage to non-invited donors, emergency path.

## 2b — History, appreciation, guardians, account lifecycle
§12, §20.
- [ ] Patient donation history (managers) and donor history with milestones (count-based badges, no ranking of donors against each other).
- [ ] `appreciation_messages` (manager → donor, moderated text, optional).
- [ ] Guardian invites: an existing manager invites another guardian by code; primary manager can remove guardians; at least one manager must remain.
- [ ] Account deletion (Play Store requirement): anonymise the profile, remove contact data and push tokens, keep donation records with the donor shown as "deleted user", end connections. Data export (JSON) of own data.
- [ ] Profile photo (optional): private Storage bucket, size/type limits, signed URLs.

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
