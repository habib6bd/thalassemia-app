# Deployment guide

Deliverable §32.12. Environment variables and secrets: `docs/ENVIRONMENT.md`.

## 1. Supabase project

1. Create a project (a paid tier before launch: free projects pause when
   inactive, and you want daily backups / PITR).
2. Link and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push          # applies supabase/migrations in order
   ```
   The migrations enable `pg_cron` and schedule the jobs:
   `process-request-timers` (every 10 min), `process-organization-reverification`
   (03:17 UTC), `process-content-review-due` (03:23), `process-daily-reminders`
   (03:41). Check them in **Database → Cron**.
3. **Auth**: email + password. Set the Site URL / redirect URLs to the app
   scheme (`thalassemia-app://`) and the web domain; turn on email
   confirmation with a deep-link redirect before launch (Q16); configure
   SMTP; enable rate limits / captcha.
4. **Edge Functions**:
   ```bash
   npx supabase functions deploy send-push
   npx supabase functions deploy delete-account
   npx supabase secrets set PUSH_WEBHOOK_SECRET=<long random string>
   ```
5. **Database Webhook** (Database → Webhooks): table `public.notifications`,
   event `INSERT`, HTTP POST to the `send-push` URL, header
   `x-webhook-secret: <same secret>`.
6. Create the first admin (README, "Community moderation"), then follow
   `docs/ADMIN_GUIDE.md`: add and verify real organizations, review and
   publish awareness content.

Upgrading: pull, `npx supabase db push`, redeploy any changed function.
Never edit an applied migration.

## 2. Android (EAS)

1. Confirm the package name and app name first (Q11); they can't change
   after the first Play Store release.
2. `npx eas login`, `npx eas init` (once), then set
   `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS
   environment variables.
3. Test build: GitHub → Actions → **EAS Build** → platform `android`
   (preview APK attached to a GitHub release), or
   `eas build -p android --profile preview`.
4. Store build: `eas build -p android --profile production` (app bundle),
   then `eas submit -p android` (internal track first).
5. Play Console: health-app declaration, data safety form (location is
   optional/approximate; account deletion inside the app), content rating.

## 3. iOS (EAS cloud)

Needs an Apple Developer account. `eas credentials -p ios` (let EAS manage
certificates), then GitHub → Actions → **EAS Build** → platform `ios`, or
`eas build -p ios --profile preview` (internal) / `--profile production`,
then `eas submit -p ios`. The config already declares no non-exempt
encryption and a foreground-only location permission text.

## 4. Web (admin and optional public web app)

```bash
EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_ANON_KEY=… npx expo export --platform web
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages,
S3 + CDN) with an SPA fallback to `index.html`. It is `noindex` and ships
`robots.txt` disallowing crawlers. Add security headers at the host:
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `frame-ancestors 'none'` (CSP).

## 5. Push notifications

Expo Go on Android can't receive remote push; use an EAS development or
production build. `send-push` needs no Expo access token unless you enable
Expo's enhanced push security (then add it to the function).

## 6. Before public launch

Work through the ⚠️ items in `docs/SECURITY_PRIVACY.md`, the open
questions in `docs/OPEN_QUESTIONS.md` (especially Q9, Q11, Q15, Q16, Q21,
Q35) and `docs/KNOWN_LIMITATIONS.md`.
