# Security and privacy checklist

Deliverable §32.9, including the Phase 4d security review. ✅ = done and
tested, ⚠️ = needs action before public launch.

## Access control

- ✅ RLS on every table; default deny; `anon` can read or write nothing
  (`05_security_invariants`).
- ✅ Stateful tables change only through RPCs; only own-row settings
  tables (`profiles`, `donor_profiles`, `push_tokens`,
  `notification_preferences`) are directly writable, column-limited.
- ✅ Every `security definer` function pins `search_path = ''` and re-checks
  `auth.uid()` and the caller's right; EXECUTE is an allow-list
  (`80_function_privileges`).
- ✅ Views are read-only (fixed SR-1, see below).
- ✅ Every permission rule has allowed and denied pgTAP tests (IDOR/BOLA).
- ✅ Admin and organization roles can't be self-assigned; an admin can't
  remove their own admin role.

## Privacy (ARCHITECTURE §9)

- ✅ Strangers see nothing about a patient; invited donors see minimal
  request data; connected donors see only fields the family allowed.
- ✅ Phone numbers only after a donor accepts **and** with the owner's
  consent (`share_contact_on_accept`).
- ✅ Broad/nearby search never returns contact data or coordinates;
  locations are opt-in, rounded to ~1 km and readable only by the donor.
- ✅ Organization staff never see thalassemia type, notes or phones.
- ✅ Push text is generic (D9): no names, diagnosis or hospital.
- ✅ Analytics are aggregates with small counts hidden; content views store
  no user id.
- ✅ Web build is `noindex, nofollow`, `robots.txt` disallows all, no
  referrer is sent.
- ✅ Data export (JSON) and account deletion (Play Store requirement).
- ⚠️ `audit_logs` keeps earlier values after account deletion; a retention
  / redaction policy is needed (Q21, legal review Q9).
- ⚠️ Legal review of Bangladesh data-protection rules, privacy policy,
  terms and Play health-app policy (Q9).

## Secrets and transport

- ✅ The app uses only the anon key; `service_role` only inside Edge
  Functions.
- ✅ Webhook secret compared in constant time (SR-2).
- ✅ HTTPS only (Supabase, Expo push).
- ⚠️ Rotate `PUSH_WEBHOOK_SECRET` and review Supabase dashboard access
  (MFA for all project members) before launch.
- ⚠️ Turn email confirmation back on with a deep-link redirect (Q16).

## Abuse and safety

- ✅ Community moderation: guidelines gate, reports (selling blood first),
  auto-hide, admin queue, blocks both ways, daily post limit.
- ✅ Blocking also stops connection requests and search/invites.
- ✅ No money fields or categories anywhere.
- ⚠️ No rate limiting beyond Supabase defaults for sign-up / RPC calls;
  consider Supabase Auth rate limits and captcha before launch.

## Phase 4d review — method and findings

Method: automated audit of catalog privileges (tables, views, columns,
functions, `anon` vs `authenticated`), manual review of each Edge
Function, reproduction attempts for each suspicion, concurrency tests
of the state machines.

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| SR-1 | High | Definer views were auto-updatable by signed-in users (and granted to `anon`), letting writes bypass RLS. Reproduced: a guardian renamed a connected donor; a donor overwrote the patient's name and thalassemia type. | Fixed (`20260928170000`), regression + invariant tests |
| SR-2 | Low | Non-constant-time webhook secret check. | Fixed |
| LT-1 | Medium | Race allowed two active commitments per donor. | Fixed (`20260928170100`) |
| A11Y-1 | Medium | Unnamed inputs on web. | Fixed |
| SR-3 | Info | `delete-account` returns the raw RPC error message on failure. The messages are our own error codes, not SQL text. | Accepted |
| SR-4 | Info | Database types and function names are visible to clients (normal for Supabase). Nothing sensitive is in names or comments. | Accepted |

Recommended before launch: an independent penetration test of the hosted
project, and a review of Supabase project settings (auth providers,
redirect URLs, SMTP, backups/PITR).
