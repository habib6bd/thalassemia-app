# Testing report

Deliverable §32.8. State at the end of Phase 4d (branch
`claude/vigilant-davinci-sr67i6`, 28 Sep 2026). Everything below was run in
the development container against a local Supabase stack
(`npx supabase start`, Postgres 17).

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| Database (pgTAP): RLS allow/deny, every RPC, state machines, privacy, invariants | `npx supabase test db` | **353 / 353 pass** (18 files) |
| Clean install of all migrations | `npx supabase db reset` | Pass |
| Concurrency / load | `scripts/load/concurrency.sh 30` (×3), `PARALLEL=50 … 100` | **13 / 13 checks pass**, each run |
| App unit tests (Jest) | `npm test` | **64 / 64 pass** (16 suites) |
| Edge Functions (Deno) | `cd supabase/functions && deno test` | **19 / 19 pass** |
| Web smoke e2e (headless Chromium, real local stack) | `npm run e2e:web` | **9 / 9 journeys pass**, no page errors |
| Typecheck / lint | `npm run typecheck`, `npm run lint` | Pass; 4 pre-existing lint warnings (React Compiler + react-hook-form `watch`) |
| Web build | `npx expo export --platform web` | Pass |
| Android e2e (Maestro) | `maestro test .maestro` | **Not run here** (no emulator in the container) |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, Jest, pgTAP, the
concurrency test and Deno tests on every push and PR.

## Database tests (pgTAP)

| File | Checks | Covers |
| --- | --- | --- |
| `00_extensions` | 2 | pg_cron, pgtap |
| `05_security_invariants` | 8 | RLS on every table, `search_path` on definer functions, no `anon` access, read-only views, writable-table allow-list, SR-1 regression |
| `10_rls_and_direct_writes` | 10 | RLS matrix, direct writes refused (D3) |
| `20_connections` | 9 | connection state machine, limit |
| `30_requests_and_responses` | 13 | request/response state machines, donation only via confirmation |
| `40_expiry_and_privacy` | 8 | expiry cascade, invited-donor privacy |
| `50_connection_counterparty` | 3 | counterparty names |
| `60_response_contact` | 5 | consent-based contact reveal |
| `70_escalation_and_search` | 34 | tiers, emergency, broad search privacy |
| `80_function_privileges` | 4 | EXECUTE allow-list |
| `90_guardians_history_account` | 49 | guardians, history, thanks, export, deletion |
| `95_community` | 53 | posts, reports, auto-hide, blocks, moderation |
| `97_organizations_admin` | 48 | directory, verification job, admin RPCs |
| `98_awareness_content` | 41 | CMS workflow, publish rules, sources |
| `99_analytics` | 16 | aggregates, small-count suppression |
| `99_nearby_and_reminders` | 23 | opt-in location, nearby search, reminders |
| `99_organization_portal` | 25 | staff membership, org-verified donations |
| `99_z_regressions` | 2 | LT-1 (single active commitment trigger) |

## Concurrency / load test

`scripts/load/concurrency.sh` signs in real test users and calls the real
RPCs from parallel `psql` sessions (default 30 in parallel).

| Scenario | Expected | Result |
| --- | --- | --- |
| A. N donors accept one request at once | all accepted, status `responding` | Pass. 30 accepts in ~0.55–0.65 s; 100 accepts (50 parallel) in ~1.9 s |
| B. 10 parallel confirmations of one response | exactly 1 donation, 9 `invalid_transition` | Pass |
| C. committed donors accept a second request | all refused `donor_has_active_commitment` | Pass |
| C2. 10 fresh donors accept two requests at the same instant | no donor holds two commitments | **Failed before the fix (2 of 10 donors double-committed)**, passes after LT-1 fix, 4 runs in a row |
| D. 10 parallel "create request" for one patient/day | exactly 1 created, 9 `duplicate_request` | Pass |
| E. 20 donors join a network with 3 places | never over the limit, exactly 3 join | Pass |

Numbers are from a single container on shared hardware; they show the
locking works, not production capacity. Supabase's hosted connection limits
(pooler) and Edge Function quotas should be load-tested on the paid tier
before launch.

## Findings fixed during Phase 4d

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| SR-1 | High | Writes through the definer views `public_profiles` / `patient_cards_for_donor` bypassed RLS (a guardian could rename a connected donor; a donor could overwrite a patient's name, thalassemia type, treating centre). Present since Phase 1. | Migration `20260928170000`: views read-only; default privileges tightened; invariant tests. |
| SR-2 | Low | Webhook secret compared with `!==`. | Constant-time `secretsMatch` + Deno test. |
| LT-1 | Medium | Race let a donor hold two active commitments (Q6). | Migration `20260928170100`: locking trigger; regression test. |
| A11Y-1 | Medium | Form inputs had no accessible name on web. | `src/components/TextField` passes the label as `accessibilityLabel` (39 inputs). |
| WEB-1 | Medium | Web build impossible: `react-dom` / `react-native-web` missing. | Added the Expo-pinned versions; PWA metadata. |
| I18N-1 | Low | A saved language choice was not re-applied after restart. | Rehydration hook in `useAppStore`; verified in the browser. |

## Web smoke e2e (`scripts/e2e/web-smoke.mjs`)

Against the exported web build and the local stack, with a new account each
run: disclaimer before sign-in → sign up → onboarding (guardian, district)
→ Learn → inheritance example banner → carrier × non-carrier grid (2/2/0)
→ Learn list says articles are under review (nothing published) →
community "New post" shows the guidelines gate → accept → publish → post
shows "Personal experience, not medical advice" → directory shows the
verified-only notice.

The web smoke test creates a real account and post, which stays in the
database. Run it after `supabase test db` (or run `npx supabase db reset`
afterwards): some pgTAP files count all community posts.

## Maestro (Android)

Flows in `.maestro/flows` (disclaimer before sign-in, Learn example,
community guidelines gate, directory notice) with a sign-in subflow.
To run: install a development or preview build on an emulator/device,
create an onboarded account, then
`E2E_EMAIL=… E2E_PASSWORD=… maestro test -e E2E_EMAIL=$E2E_EMAIL -e E2E_PASSWORD=$E2E_PASSWORD .maestro`.
They have **not** been run yet (no emulator in the build container).

## Not covered yet

- Push delivery end-to-end (needs an EAS development build and a device).
- Maestro on a real device; iOS build (needs Apple credentials).
- Screen-reader walkthrough (TalkBack/VoiceOver) beyond the input-name fix.
- Load against the hosted Supabase tier.
