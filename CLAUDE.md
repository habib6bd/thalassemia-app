# Thalassemia Support & Donor Network (Bangladesh)

Expo (React Native, TypeScript) + Supabase app that helps thalassemia patients
and guardians keep a trusted network of regular/backup blood donors, plus
community support and carrier-awareness education. Bangla first, English second.

## Where things are

- `docs/ARCHITECTURE.md`: schema, RLS matrix, state machines, privacy model. **Source of truth.**
- `docs/phase-0-setup.md`, `docs/phase-1.md`, `docs/phase-2.md`, `docs/phase-3-4.md`: task checklists.
- `docs/OPEN_QUESTIONS.md`: ambiguities, with the defaults to use.
- `docs/CLOUD_SESSIONS.md`: how to run autonomous sessions.
- `thalassemia_app_master_implementation_prompt.md`: full original requirements. **Don't read it all.** Open only the section (§N) a task cites.

## Workflow rules

- Work on **one phase part per session** (e.g. "1a"). Don't start the next part.
- Work autonomously: don't stop to ask. For an ambiguity, pick the default in OPEN_QUESTIONS (or add a new entry with a proposed default) and list it in the PR.
- Before finishing: run `npm run lint`, `npm run typecheck`, `npm test`, and `npx supabase test db` if Docker is available. Fix failures. Tick completed `- [ ]` items in the phase file.
- Branch `phase-<part>-<slug>` from `dev`, conventional commits, open a PR into `dev`. The PR lists what was done, tests run, open questions and known gaps.
- Keep changes modular. Don't rewrite existing working code without a stated reason.
- If you change the schema, permissions or a state machine, update `docs/ARCHITECTURE.md` in the same PR.

## Non-negotiable product rules (master prompt §2, §28)

1. The app never decides donor eligibility, blood quantity, blood compatibility, medicine or dosage, diagnosis, or genetic status. It only records and reminds, with disclaimers.
2. Accepting a request ("I can donate") is never a completed donation. Only a patient manager's `confirm_donation` creates a `donations` row.
3. Declining or leaving carries no penalty and is not shown to others.
4. Patients can remove/replace donors; donors can leave a network. Max connected donors comes from `app_settings.max_connected_donors` (default 6), never hard-coded.
5. Patient medical info is private by default. Strangers see nothing; invited donors see minimal request info only (ARCHITECTURE §9).
6. No money, prices or payment anywhere. It is not a blood marketplace.
7. Emergency screens state the app is not an emergency service.
8. Community content is moderated and labelled as personal experience.
9. Medical content is published only with sources plus human review. Agents write drafts only.
10. Never invent hospitals, organizations, phone numbers, statistics or medical facts. No seeded real organizations.
11. Important actions are audited (append-only `audit_logs`).

## Backend conventions (Supabase)

- Migrations in `supabase/migrations/` (never edit an applied migration; add a new one). Tests in `supabase/tests/*.test.sql` (pgTAP).
- RLS on **every** table. Stateful tables are changed only via `security definer` RPCs with `set search_path = ''` (ARCHITECTURE D2/D3).
- RPCs: check `auth.uid()` and authorization explicitly, lock rows, validate the transition, audit, enqueue notifications.
- Errors: `raise exception using errcode='P0001', message='<snake_case_code>'`. Add an `errors.<code>` key to both locale files.
- Every permission rule needs a pgTAP test for both the allowed **and** the denied case.
- After a schema change, regenerate `src/lib/database.types.ts`.

## Frontend conventions (Expo)

- TypeScript strict, Expo Router in `src/app`, features in `src/features/<module>/`.
- **Every user-facing string goes through i18next**, with keys present in both `src/locales/bn` and `src/locales/en`. No hard-coded text.
- React Query for server data (hooks in `features/*/api.ts`); Zustand only for session, active role and language.
- Forms use react-hook-form + zod; the zod schemas mirror DB constraints.
- UI uses react-native-paper. Mobile-first, large text, 48dp touch targets, and status is never shown by colour alone.
- Keep it web-compatible (no Android-only native modules). Don't polish web yet.
- Env via `EXPO_PUBLIC_*` variables only. Never commit secrets; never use the `service_role` key in the app.

## Commands

```
npx expo start --tunnel     # dev on phone via Expo Go
npm run lint | typecheck | test
npx supabase start          # local stack (Docker)
npx supabase test db        # pgTAP
npx supabase gen types typescript --local > src/lib/database.types.ts
```
