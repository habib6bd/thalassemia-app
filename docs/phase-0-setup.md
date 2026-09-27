# Phase 0 — Project Setup

Goal: an empty but production-shaped Expo + Supabase project with CI, so every
later phase only adds features. One PR.

Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md` §3, §12, §13.

## Tasks

- [x] Create Expo app in the repo root (latest stable SDK, TypeScript strict, Expo Router, `src/app` layout). Keep `docs/` and the master prompt file.
- [x] Install: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `@tanstack/react-query`, `zustand`, `i18next`, `react-i18next`, `expo-localization`, `react-hook-form`, `zod`, `@hookform/resolvers`, `react-native-paper`, `@expo-google-fonts/noto-sans-bengali`, `expo-notifications`, `expo-device`. Use `npx expo install` for native-linked packages.
- [x] Dev tooling: ESLint (`eslint-config-expo`), Prettier, `jest-expo`, `@testing-library/react-native`. npm scripts: `lint`, `typecheck` (`tsc --noEmit`), `test`, `format`.
- [x] `src/lib/supabase.ts`: client from `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, AsyncStorage session on native, default storage on web. Throw a clear error if env is missing.
- [x] `src/lib/i18n.ts`: i18next, `bn` default + fallback `en`, namespaces per feature, `src/locales/{bn,en}/common.json`. A test fails if a key exists in one language but not the other.
- [x] `src/lib/errors.ts`: map a Supabase/RPC error message code → `t('errors.<code>')`, with a generic fallback.
- [x] Theme: react-native-paper MD3 theme, Noto Sans Bengali, large base font size, accessible colours. Shared components: `Screen`, `PrimaryButton`, `StatusChip`, `EmptyState`, `ErrorText`, `Disclaimer`.
- [x] Placeholder routes: `(auth)/sign-in`, `(tabs)/index` showing an i18n'd welcome text. Language toggle stored in Zustand + AsyncStorage.
- [x] Supabase: `npx supabase init`. Enable `pg_cron` and `pgtap` in the first migration (`supabase/migrations/<ts>_extensions.sql`). One trivial pgTAP test so `supabase test db` runs.
- [x] `.env.example` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (no real values). `.gitignore` covers `.env*` except `.env.example`.
- [x] `app.json`/`app.config.ts`: name + package from OPEN_QUESTIONS Q11, `scheme`, web `noindex`, no Android-only native modules.
- [x] `eas.json` profiles: `development` (dev client), `preview` (Android **APK**, internal distribution), `production` (Android **AAB**; comment says this is for the Play Store). iOS left buildable (no local-Mac requirement).
- [x] `.github/workflows/ci.yml`: on push + PR → `npm ci`, lint, typecheck, jest; separate job: `supabase/setup-cli` → `supabase start` → `supabase test db`.
- [x] `.github/workflows/eas-build.yml`: `workflow_dispatch` only (Q10). Uses `EXPO_TOKEN` secret, builds the `preview` profile for Android, waits, downloads the APK and attaches it to a GitHub Release (tag `build-<run_number>`) and as a workflow artifact.
- [x] `README.md`: prerequisites, env setup, `npx expo start --tunnel` + Expo Go on an Android phone, running the Supabase local stack, tests, triggering the APK build, required GitHub/EAS secrets.

## Done when

- `npm run lint && npm run typecheck && npm test` pass locally.
- CI workflow file is valid. If the cloud sandbox can't run Docker, note in the PR that `supabase test db` is verified by CI only.
- The app starts in Expo Go and shows the Bangla welcome screen; the language toggle switches to English.
