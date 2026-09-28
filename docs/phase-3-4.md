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

- [ ] Aggregate-only analytics views (§23): active patients/donors, requests, fulfilment rate, median response time, completed donations, networks, content views. No per-person drill-down. Suppress small counts (< 5).
- [ ] Organization portal: `organization_members`; org staff can verify donations (`org_verified`) for requests linked to their organization.
- [ ] Verification workflows for organizations and (optionally) donors.
- [ ] Radius/distance search (opt-in location), availability reminders, more automation.
- [ ] Web/PWA polish, iOS build via EAS cloud, Maestro e2e, security review, load test for concurrent requests.
- [ ] Final deliverables (§32): produce each document when its phase is done, not all at the end.
