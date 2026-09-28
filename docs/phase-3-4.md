# Phase 3 — Awareness & Carrier Education

Master prompt §14–§17, §19, §26 Step 7. Before starting, expand this checklist to
Phase 1 detail and update ARCHITECTURE §6.

**Hard rule:** agents may write *draft* content, but nothing medical is
published by code or seed. Publishing requires `review_status = published`,
at least one `content_sources` link, a human `reviewed_by`, and `reviewed_at`.

- [x] CMS tables: `content_sources` (title, org, url, accessed_at), `awareness_articles` (slug, bn/en title/summary/body, category, `review_status`, reviewer, review dates, `next_review_due`), `article_sources`, `faqs`. _(Implemented as `awareness_content` with `kind` article/faq/medicine and `content_source_links`, Q33.)_
- [x] Admin editor with a review workflow: draft → in_review → approved → published → retired. Every article shows its sources, review date and last-updated date.
- [x] Learn tab: short Bangla-first cards + articles. Categories: what is thalassemia, what is a carrier, why screening matters, if both partners are carriers, genetic counselling, screening, family awareness. _(A `/learn` stack reached from Home, Q32.)_
- [x] Draft content (status `draft` only) based on the reference sources in master prompt §33 (WHO, CDC, TIF, PMC). The tone is non-judgmental, and it never tells anyone whom to marry (§15). _(Sources could not be opened from the build environment; they are seeded as unchecked, Q35.)_
- [x] Inheritance simulator: a fixed educational diagram (carrier × carrier, carrier × non-carrier) of autosomal recessive inheritance. Persistent banner: "শিক্ষামূলক উদাহরণ — ব্যক্তিগত চিকিৎসা/জেনেটিক ঝুঁকি মূল্যায়ন নয়" (an educational example, not a personal medical or genetic risk assessment). It takes **no** user genetic input and stores nothing.
- [x] "Learn about carrier screening" journey (not an "Are you a carrier?" quiz). It ends with "talk to a doctor / genetic counsellor" and a link to directory entries of type `genetic_counselling`.
- [x] Optional `medicine_info` (informational only, generic name, general purpose, official source link). No dosage and no availability claims (§19). _(Supported as `kind = medicine` with a medicine disclaimer; no entries drafted.)_
- [x] `docs/CONTENT_SAFETY.md`: copy checklist (no diagnosis, no eligibility, no dosage, no fear messaging, sources cited, reviewed).

## Phase 3 — concrete plan
Decisions: OPEN_QUESTIONS Q32–Q36. State machine: ARCHITECTURE §7.6.

Schema (migrations `20260928130000_phase3_awareness_cms.sql`, `20260928130100_phase3_draft_content.sql`)
- [x] Enums `content_kind`, `awareness_category` (7 required + living_with_thalassemia, medicines), `content_review_status`.
- [x] `content_sources` (`accessed_at` null = not yet checked by a person), `awareness_content`, `content_source_links`; RLS: users read published content (reader columns only) and its sources; admins read all; audit triggers.
- [x] Trigger `enforce_content_publish_rules`: published ⇒ reviewer + ≥ 1 source + all sources checked.
- [x] Setting `content_review_months` (12); pg_cron `process-content-review-due` reminds admins once.
- [x] Seed: 4 reference sources (unchecked) and 10 agent drafts (7 articles, 3 FAQs) in bn/en, all `draft`.

RPCs (admin only)
- [x] `admin_upsert_content_source` (`invalid_source`, `source_in_use`), `admin_list_content`, `admin_get_content`.
- [x] `admin_upsert_content` (`content_locked`, `slug_taken`, `invalid_content`; edits reset to draft), `admin_set_content_sources`.
- [x] `admin_transition_content` (`invalid_transition`, `review_required`, `source_required`, `source_not_checked`; audited).

Tests (`supabase/tests/98_awareness_content.test.sql`, 41 checks; allow-list in `80_…`)
- [x] Seed is all draft, agent-marked, sources unchecked and cited.
- [x] Users: no drafts, no sources of drafts, no review columns, no admin RPCs, no direct writes.
- [x] Workflow: no skipping review, reviewer recorded, unchecked/no sources block publishing, publish sets review dates, audited, published locked, retire hides, edits reset review, re-review reminder once and re-review restarts the clock.

App
- [x] Learn (`/learn`, Home → "Learn about thalassemia & carriers"): categories, articles/FAQs with sources, review and last-updated dates, disclaimers; genetic-counselling directory link.
- [x] Inheritance example (fixed 2×2 grid, icon + text, banner, no input) and screening journey (steps by category, ends with a professional + directory).
- [x] Admin → Awareness content: list by status, editor (bn/en, category, kind, slug, order), sources picker, workflow buttons with review note; Admin → Sources (add, edit, "checked today").
- [x] `content_review_due` notification routed to the editor; bn/en strings; push title.

# Phase 4 — Analytics, Organization Portal, Polish

Split into parts so each session stays reviewable: 4a analytics, 4b
organization portal, 4c search & reminders, 4d polish & release.

## 4a — Aggregate analytics (done)
- [x] Aggregate-only analytics views (§23): active patients/donors, requests, fulfilment rate, median response time, completed donations, networks, content views. No per-person drill-down. Suppress small counts (< 5).

Plan (migration `20260928140000_phase4a_analytics.sql`; decisions Q37, Q38)
- [x] Setting `analytics_min_cell_size` (5); `suppress_small_count(n)` returns null for 1..min-1.
- [x] `content_view_counts` (content, day, views; no user id, no client read) + `record_content_view` (published items only).
- [x] `admin_analytics(period_days)`: current counts (patients, donors, networks, connections) and period counts (requests, emergencies, closed/fulfilled, fulfilment rate, median minutes to first "I can donate", donations incl. org-verified, community posts/reports, content views), requests by division and top content; rates/medians need ≥ min requests.
- [x] Tests `99_analytics.test.sql` (16): admin only, suppression of counts/rates/medians, no names or lists, correct values when allowed, anonymous view counting.
- [x] App: Admin → Analytics (period switch, stat tiles, "fewer than 5" labels, division and top-content lists, privacy note); Learn items record a view when opened.

## 4b — Organization portal (done)
- [x] Organization portal: `organization_members`; org staff can verify donations (`org_verified`) for requests linked to their organization.
- [x] Verification workflows for organizations (2d). _Donor verification (optional) is not implemented (Q41)._

Plan (migration `20260928150000_phase4b_organization_portal.sql`; decisions Q7, Q39–Q41)
- [x] `organization_members` (RLS: own rows, admin); helper `is_active_organization_member` (member + verified org + organization role); account deletion removes memberships.
- [x] Admin: `admin_set_organization_member` (grants the organization role; removing the last membership revokes it; notifies), `admin_list_organization_members`.
- [x] Staff: `org_my_organizations`, `org_list_requests` (linked, open or fulfilled ≤ 30 days; minimal fields), `org_list_request_responses` (donor display name + status only), `org_confirm_donation` (`org_verified`; `invalid_donation_date`; notifies donor and managers).
- [x] Tests `99_organization_portal.test.sql` (25): membership allow/deny, role grant/revoke, visibility limited to linked requests, no thalassemia type/notes/phones, other org and guardians denied, confirmation once, date check, managers notified, unverified org can't act.
- [x] App: Profile → Organization portal (organizations → linked requests → donors → confirm); Admin → organization → Portal staff (search, add, remove).

## 4c — Search & reminders (done)
- [x] Radius/distance search (opt-in location), availability reminders, more automation.

Plan (migration `20260928160000_phase4c_nearby_and_reminders.sql`; decisions Q42–Q45)
- [x] `donor_locations` (owner-only, rounded to ~1 km) + `set_donor_location` (nulls stop sharing); removed on account deletion.
- [x] `distance_km`, `request_donor_distance_km` (request location = its linked verified organization's coordinates).
- [x] `search_nearby_donors(request_id, radius_km)`: broad-search gates, radius ≤ `nearby_search_max_km` (50), distance bands only.
- [x] `is_broad_eligible_donor` (replaced): nearby donors count as reachable for broad invites; blocked pairs excluded from broad search and invites (Q27).
- [x] `process_daily_reminders` (pg_cron 03:41): donor check-ins (`donation_reminder_days`, own "available from" date; opt-out `availability_reminders`), manager reminders `transfusion_reminder_days` before `next_transfusion_date` unless a request covers it.
- [x] Tests `99_nearby_and_reminders.test.sql` (23): location privacy/rounding/validation, gates, radius cap, bands without coordinates, missing location, blocks, cross-division nearby invite, stop sharing, reminders once / opt-out / covered-date suppression, cron.
- [x] App: donor profile "Nearby search (optional)" (foreground `expo-location`, low accuracy, share / update / stop) and "Check-in reminders" switch; request search "By district | Nearby" with 10/25/50 km and distance bands; new notifications routed, translated, push titles.

## 4d — Polish & release (done)

- [x] Web/PWA polish, iOS build via EAS cloud, Maestro e2e, security review, load test for concurrent requests. _(iOS build and Maestro are configured but not run: no Apple account / emulator in the build environment.)_
- [x] Final deliverables (§32): `docs/DELIVERABLES.md` indexes all 14.

Plan and results (details in `docs/TESTING_REPORT.md`, `docs/SECURITY_PRIVACY.md`)

- [x] Security review: catalog audit + reproduction; fixed SR-1 (writable definer views bypassed RLS, migration `20260928170000`) and SR-2 (constant-time webhook secret); invariant tests `05_security_invariants` (8).
- [x] Load test `scripts/load/concurrency.sh` (runs in CI): accepts, confirmations, duplicate requests, network limit; fixed LT-1 (double commitment race, migration `20260928170100`, test `99_z_regressions`).
- [x] Web: added `react-dom` / `react-native-web` (web build was impossible), `public/index.html` (bn, noindex, no-referrer, manifest), `public/manifest.json` + icons; fixed language rehydration.
- [x] Accessibility: `TextField` gives every input an accessible name (was missing on web).
- [x] iOS: EAS profiles, export-compliance flag, workflow platform choice.
- [x] e2e: `.maestro/` flows (Android) and `npm run e2e:web` (9 journeys on web + local stack, passing).
- [x] Docs: API (generated), roles, business rules, environment, testing report, security/privacy, admin guide, deployment, known limitations.
