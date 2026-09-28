# Thalassemia Support & Donor Network

Expo (React Native, TypeScript) + Supabase app for thalassemia patients and
guardians to manage a trusted network of blood donors. See `CLAUDE.md` and
`docs/ARCHITECTURE.md` for the full design.

## Prerequisites

- Node.js 20+
- An Android phone with [Expo Go](https://expo.dev/go) installed, for device testing
- [Docker](https://docs.docker.com/get-docker/), for running the local Supabase stack
- A free [Supabase](https://supabase.com) project (needed from Phase 1b onward)
- A free [Expo](https://expo.dev) account, for EAS builds

## Setup

```bash
npm install
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
```

## Running the app

```bash
npx expo start --tunnel   # scan the QR code with Expo Go on your Android phone
npm run web                # or run in a browser (web is not polished yet)
```

The app defaults to Bangla; use the language toggle on the home screen to
switch to English.

## Backend (Supabase)

```bash
npx supabase start                 # local Postgres + Auth + Storage stack (needs Docker)
npx supabase test db               # run pgTAP tests
npx supabase gen types typescript --local > src/lib/database.types.ts
```

Migrations live in `supabase/migrations/`; tests in `supabase/tests/*.test.sql`.
Never edit an already-applied migration — add a new one instead.

## Community moderation (Phase 2c)

The community (Home → **Community**) is moderated. To review reports you need
a user with the `admin` role. Admin roles are never self-assigned; grant one
in the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
select user_id, 'admin' from public.profiles where user_id = '<auth user id>';
```

The admin then sees **Profile → Admin** (analytics, users & roles, requests
overview, organizations & verification with portal staff, awareness content,
reports queue, settings) and **Profile →
Community moderation**. Thresholds are
product settings in `app_settings` (`community_auto_hide_report_threshold`,
`community_daily_post_limit`, `community_guidelines_version`).

After pulling new migrations, apply them to the hosted project with
`npx supabase db push` (linked project) before running the app against it.

## Checks

```bash
npm run lint
npm run typecheck
npm test
```

All three, plus `npx supabase test db` when Docker is available, must pass
before opening a PR (see `CLAUDE.md`).

## Push notifications

In-app notifications (`notifications` table) always work. Push is a nudge on
top of that and needs a few things set up on the Supabase project:

1. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy send-push
   npx supabase secrets set PUSH_WEBHOOK_SECRET=<a random string>
   ```
2. In the Supabase dashboard, add a **Database Webhook**: table
   `public.notifications`, event `INSERT`, HTTP request to the deployed
   `send-push` function URL, with a custom header
   `x-webhook-secret: <the same random string>`.
3. `send-push` looks up the recipient's `notification_preferences` (skips if
   `push_enabled = false` for that type), loads their `push_tokens`, sends a
   generic push via the Expo Push API (never patient name, diagnosis, phone
   or hospital — ARCHITECTURE.md §9/§10, decision D9), records `pushed_at`,
   and deletes any token Expo reports as `DeviceNotRegistered`.

**Expo Go on Android (SDK 53+) cannot receive remote push at all** — this is
an Expo/Android platform limitation, not a bug. Everything else (auth, RLS,
the in-app notifications list) works fine in Expo Go; to test push itself you
need an EAS development build (`eas build --profile development`). The
notifications screen shows an in-app hint when it detects this case.

Edge Function logic lives in `supabase/functions/send-push/`, with pure
helpers (`lib.ts`, `messages.ts`) unit-tested via `deno test`:

```bash
cd supabase/functions && deno test
```

## Account deletion

The Profile screen's **Delete my account** button calls the `delete-account`
Edge Function. It runs `public.delete_my_account()` as the signed-in user
(anonymises the profile, ends connections and open responses, hands patients
over to other guardians or archives them), then soft-deletes the auth user
with the service role so the person can't sign in again. Deploy it with:

```bash
npx supabase functions deploy delete-account
```

It uses the project's built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`. No extra secrets are needed. Keep JWT
verification on (the default) for this function.

## CI / CD

- **`.github/workflows/ci.yml`**: runs on every push and PR — lint, typecheck,
  Jest; (in a separate job with Docker) the pgTAP suite; and (in a separate
  job) `deno test` for the Edge Functions.
- **`.github/workflows/eas-build.yml`**: manual (`workflow_dispatch`) build of
  the Android **preview** APK via EAS, attached to a GitHub Release
  (tag `build-<run_number>`) and as a workflow artifact.

### Required secrets

| Secret                          | Where                                | Used for                        |
| ------------------------------- | ------------------------------------ | ------------------------------- |
| `EXPO_TOKEN`                    | GitHub Actions secret                | Authenticates `eas build` in CI |
| `EXPO_PUBLIC_SUPABASE_URL`      | GitHub Actions secret + local `.env` | Supabase project URL            |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | GitHub Actions secret + local `.env` | Supabase anon key               |

Never commit real values for these — only `.env.example` is checked in, and
the app never uses the Supabase `service_role` key.

## Triggering an APK build

Push to GitHub, then run the **EAS Build (Android APK)** workflow manually
from the Actions tab (`workflow_dispatch`). The resulting APK is attached to
a new GitHub Release and to the workflow run as an artifact.

## Progress and open queries

| Part                                                   | Status                                       |
| ------------------------------------------------------ | -------------------------------------------- |
| Phase 0, 1a–1d                                         | Done                                         |
| 2a Escalation, broad search, emergency                 | Done                                         |
| 2b History, appreciation, guardians, account lifecycle | Done (profile photos deferred, Q23)          |
| 2c Community & moderation                              | Done                                         |
| 2d Verified organization directory + admin basics      | Done                                         |
| Phase 3 Awareness & carrier education                  | Done (content still needs human review, Q35) |
| 4a Analytics                                           | Done                                         |
| 4b Organization portal                                 | Done                                         |
| 4c Search & reminders                                  | **Next**                                     |
| 4d Polish & release                                    | Not started                                  |

Queries for the product owner. Development continues with the default shown
here; full details are in `docs/OPEN_QUESTIONS.md`.

- **Q24 — "Financial/support resources" topic.** The master prompt lists it,
  but money-related categories are forbidden. Default: a `support_resources`
  topic ("Support services & information") with no money wording.
- **Q25 — Report threshold.** Default: 3 distinct reports hide a post or
  comment until an admin reviews it; admins are alerted immediately for
  "selling blood" reports; max 10 posts per user per day; no post editing yet.
- **Q26 — Where the community lives.** Default: reached from Home and
  Profile, not a 7th bottom tab. Should it become a tab (maybe together with
  the Learn section)? See Q32 below.
- **Q27 — Blocking and existing donor connections.** Default: blocking stops
  new connection requests both ways but does not end an existing connection.
- **Q28 — Stale directory entries.** Default: admins are reminded 30 days
  before, and after 12 months without re-verification the entry is hidden
  until re-verified.
- **Q29 — Linking requests to organizations.** Default: via the patient's
  linked centre (new requests inherit it); no per-request picker screen yet.
- **Q30 — Admin requests overview.** Default: aggregate counts only, no list
  of individual requests or patients.
- **Q31 — Roles.** Default: admins manage only the `organization` and
  `admin` roles; the first admin is created with SQL; nobody can remove
  their own admin role.
- **Q35 — Draft medical content needs a human reviewer.** 10 bn/en drafts
  (7 articles, 3 FAQs) are in Admin → Awareness content, all unpublished.
  The agent could not open the WHO/CDC/PMC sources from its environment, so
  the sources are marked "not yet checked". A qualified person must open
  each source, check each draft against it and `docs/CONTENT_SAFETY.md`,
  then approve and publish. The fixed texts of the inheritance example and
  screening journey need the same review before release.
- **Q32 — Navigation.** Learn is reached from Home, not a tab. Proposal: a
  five-tab layout before launch (see `docs/OPEN_QUESTIONS.md`).
- **Q34 — Correcting published content** takes it offline while it is
  edited and reviewed again (no versioning yet).
- **Q36 — Single reviewer.** An admin can approve content they edited
  (recorded in the audit log); a two-person rule can be added later.
- **Q37 — Analytics privacy.** Counts below 5 are hidden; admins see
  totals only, never individual people or requests.
- **Q39 — What organization staff see.** Patient display name, blood group,
  donors needed, time, status and donor display names for requests linked
  to their verified organization; no medical details, notes or phones.
- **Q40 — Organization verification of donations.** Staff can only confirm
  donations not already confirmed by the family; confirmed donations are
  never changed.
- **Q41 — Donor verification** is not implemented (needs a process and
  legal review).
- **Directory content.** No organizations are included. An admin must add
  and verify each real entry (call it or check its official website)
  before users see it.
- **Community guidelines text** (bn/en, `community.guidelines.*` in the locale
  files) was drafted by an agent and needs a human review before launch.
- Still open from earlier phases: Q9 (legal review), Q11 (package name before
  the first store build), Q15 (verify 999), Q16 (email confirmation redirect),
  Q21 (audit-log retention after account deletion).
