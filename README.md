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
