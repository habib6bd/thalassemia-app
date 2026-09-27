# Phase 3 — Awareness & Carrier Education

Master prompt §14–§17, §19, §26 Step 7. Before starting, expand this checklist to
Phase 1 detail and update ARCHITECTURE §6.

**Hard rule:** agents may write *draft* content, but nothing medical is
published by code or seed. Publishing requires `review_status = published`,
at least one `content_sources` link, a human `reviewed_by`, and `reviewed_at`.

- [ ] CMS tables: `content_sources` (title, org, url, accessed_at), `awareness_articles` (slug, bn/en title/summary/body, category, `review_status`, reviewer, review dates, `next_review_due`), `article_sources`, `faqs`.
- [ ] Admin editor with a review workflow: draft → in_review → approved → published → retired. Every article shows its sources, review date and last-updated date.
- [ ] Learn tab: short Bangla-first cards + articles. Categories: what is thalassemia, what is a carrier, why screening matters, if both partners are carriers, genetic counselling, screening, family awareness.
- [ ] Draft content (status `draft` only) based on the reference sources in master prompt §33 (WHO, CDC, TIF, PMC). The tone is non-judgmental, and it never tells anyone whom to marry (§15).
- [ ] Inheritance simulator: a fixed educational diagram (carrier × carrier, carrier × non-carrier) of autosomal recessive inheritance. Persistent banner: "শিক্ষামূলক উদাহরণ — ব্যক্তিগত চিকিৎসা/জেনেটিক ঝুঁকি মূল্যায়ন নয়" (an educational example, not a personal medical or genetic risk assessment). It takes **no** user genetic input and stores nothing.
- [ ] "Learn about carrier screening" journey (not an "Are you a carrier?" quiz). It ends with "talk to a doctor / genetic counsellor" and a link to directory entries of type `genetic_counselling`.
- [ ] Optional `medicine_info` (informational only, generic name, general purpose, official source link). No dosage and no availability claims (§19).
- [ ] `docs/CONTENT_SAFETY.md`: copy checklist (no diagnosis, no eligibility, no dosage, no fear messaging, sources cited, reviewed).

# Phase 4 — Analytics, Organization Portal, Polish

- [ ] Aggregate-only analytics views (§23): active patients/donors, requests, fulfilment rate, median response time, completed donations, networks, content views. No per-person drill-down. Suppress small counts (< 5).
- [ ] Organization portal: `organization_members`; org staff can verify donations (`org_verified`) for requests linked to their organization.
- [ ] Verification workflows for organizations and (optionally) donors.
- [ ] Radius/distance search (opt-in location), availability reminders, more automation.
- [ ] Web/PWA polish, iOS build via EAS cloud, Maestro e2e, security review, load test for concurrent requests.
- [ ] Final deliverables (§32): produce each document when its phase is done, not all at the end.
