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

## CI / CD

- **`.github/workflows/ci.yml`**: runs on every push and PR — lint, typecheck,
  Jest, and (in a separate job with Docker) the pgTAP suite.
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
