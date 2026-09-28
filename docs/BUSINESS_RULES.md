# Business rules

Deliverable §32.5. Each rule lists where it is enforced and tested.
Configurable values live in `app_settings` (Admin → App settings) and are
product rules, never medical rules.

## Safety rules (master prompt §2, §28; CLAUDE.md)

| # | Rule | Enforced by | Tested in |
| --- | --- | --- | --- |
| 1 | The app never decides eligibility, quantity, compatibility, medicine, diagnosis or genetic status. It records and reminds, with disclaimers. | Copy + `docs/CONTENT_SAFETY.md`; exact blood-group match only (D7); reminders say "check with a doctor / blood bank". | Review checklist; web e2e checks disclaimers. |
| 2 | "I can donate" is never a donation. Only `confirm_donation` (manager) or `org_confirm_donation` (verified organization staff) creates a `donations` row. | RPCs; `donations` not writable by clients. | `30_…`, `99_organization_portal`, `05_security_invariants`. |
| 3 | Declining or leaving has no penalty and isn't shown to others. | Response/connection RPCs; donor list views. | `20_…`, `30_…`. |
| 4 | Families can remove/replace donors; donors can leave. At most `max_connected_donors` (6) connections, checked under a lock. | `request_connection_*`, `set_connection_status`. | `20_…`; load test E. |
| 5 | Patient medical data is private by default (ARCHITECTURE §9). | RLS, minimal RPC outputs, `show_*` flags. | `10_…`, `40_…`, `99_organization_portal`. |
| 6 | No money anywhere; "selling blood" is the first report reason. | No money fields; community topics; report reasons. | `95_community`, schema tests. |
| 7 | Emergency screens say the app is not an emergency service (call 999 / hospital, Q15). | Publish requires `emergency_acknowledged`. | `70_…`, `EmergencyNotice.test.tsx`. |
| 8 | Community content is moderated and labelled "personal experience". | Guidelines gate, reports, auto-hide, admin queue. | `95_community`; web e2e. |
| 9 | Medical content is published only with checked sources and a human review. | `admin_transition_content` + publish trigger. | `98_awareness_content`. |
| 10 | No invented organizations, phones or facts; nothing seeded. | Empty directory; drafts only. | `97_…` ("no organization is seeded"), `98_…`. |
| 11 | Important actions are audited. | `audit_row_change` triggers, `write_audit`. | `10_…`, `95_…`, `97_…`, `98_…`. |

## Workflow rules

- **Requests**: one live request per patient per day (`duplicate_request`,
  load test D). Tiers only move forward: regular → backup (after
  `regular_response_window_hours` = 6, or earlier when nobody regular can
  answer) → broad (manager widens). Emergency requests invite regular +
  backup at once and optionally opted-in emergency donors (Q17, Q18).
- **Status** is derived from responses; `fulfilled` once confirmed
  donations ≥ units. Expired `request_expiry_grace_hours` (24) after the
  required time.
- **One active commitment per donor** (Q6): a donor with an accepted or
  scheduled response on a live request can't accept another. Enforced in
  the RPC and, since 4d, by a locking trigger (load-test finding LT-1).
- **Broad / nearby search** shows only opted-in donors with the exact blood
  group who are available, never contact data; up to
  `broad_invite_limit` (20) outside invites per request. Nearby search uses
  distance bands within `nearby_search_max_km` (50). Blocked pairs never
  see each other.
- **Guardians**: invite codes are single-use, expire after
  `guardian_invite_ttl_hours` (72); up to `max_patient_managers` (5); the
  last manager can't leave; the primary is handed over automatically.
- **Community**: `community_daily_post_limit` (10) posts / 24 h; content is
  hidden after `community_auto_hide_report_threshold` (3) distinct reports
  until reviewed; blocking hides content both ways and blocks connection
  requests.
- **Directory**: only `verified` entries are shown, with the last verified
  date; re-verification is due after `organization_reverify_months` (12),
  admins reminded `organization_reverify_reminder_days` (30) before.
- **Awareness content**: draft → in review → approved (human) → published
  → retired; published items are locked; re-review after
  `content_review_months` (12).
- **Reminders**: donor check-in `donation_reminder_days` (120) after the
  last recorded donation or on their own "available from" date (opt-out);
  families `transfusion_reminder_days` (3) before the next transfusion date
  unless a request covers it.
- **Analytics**: aggregates only; counts under `analytics_min_cell_size`
  (5) hidden.
- **Account deletion**: profile anonymised, contacts, tokens, location and
  community content removed, open work closed without penalty; confirmed
  donations stay as "Deleted user" (Q21).
