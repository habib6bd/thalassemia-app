# Environment variables and secrets

Deliverable §32.7. Never commit real values. The app never uses the
`service_role` key; only the Edge Functions do, from Supabase's own
environment.

## App (Expo) — `.env` locally, EAS / GitHub secrets for builds

Only `EXPO_PUBLIC_*` variables reach the app bundle, and they are public by
design (anyone can read them from the app).

| Variable | Required | Example | Used for |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | yes | `https://xyz.supabase.co` | Supabase API URL (`src/lib/supabase.ts`). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | `eyJ…` | Public anon key; all access is limited by RLS and RPC checks. |

Local: `cp .env.example .env`. For the local stack, take the values from
`npx supabase status` (`API_URL`, `ANON_KEY`).

## Edge Functions — Supabase project secrets

| Secret | Function | Set with | Notes |
| --- | --- | --- | --- |
| `PUSH_WEBHOOK_SECRET` | `send-push` | `npx supabase secrets set PUSH_WEBHOOK_SECRET=<random>` | Must equal the `x-webhook-secret` header of the Database Webhook. Compared in constant time. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | both | provided by Supabase | Not set by hand. |

## CI / builds — GitHub Actions secrets

| Secret | Used by | Purpose |
| --- | --- | --- |
| `EXPO_TOKEN` | `eas-build.yml` | Authenticates `eas build`. |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | EAS builds (set as EAS secrets or env) | Baked into the app build. |

iOS builds additionally need Apple Developer credentials stored in EAS
(`eas credentials`), not in GitHub.

## Tooling variables (optional)

| Variable | Where | Purpose |
| --- | --- | --- |
| `DB_URL` | `scripts/load/concurrency.sh`, `scripts/gen-api-docs.sh` | Defaults to the local stack. **Never** point the load test at production. |
| `DONORS`, `PARALLEL` | `scripts/load/concurrency.sh` | Load size (first argument) and parallelism. |
| `BASE_URL`, `CHROME_PATH` | `scripts/e2e/web-smoke.mjs` | Web build URL and a Chromium binary. |
| `E2E_EMAIL`, `E2E_PASSWORD` | `.maestro/flows` | Onboarded test account for Maestro. |
| `EXPO_OFFLINE=1` | `expo export` | Build without contacting Expo's servers (restricted networks). |
