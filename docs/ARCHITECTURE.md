# Architecture & Data Design

Source of truth for schema, permissions and state machines. Phase specs
(`docs/phase-*.md`) reference sections here. If code and this document
disagree, fix one of them in the same PR — never let them drift.

Master requirements: `thalassemia_app_master_implementation_prompt.md`
(read only the sections a task points to).

---

## 1. System overview

```
Expo app (Android first, iOS later, web optional; TypeScript, Expo Router)
   │  supabase-js (anon key + user JWT)
   ▼
Supabase
   ├─ Auth ............ email + password (phone OTP later, see OPEN_QUESTIONS Q1)
   ├─ Postgres ........ tables + RLS (read access) + RPC functions (all writes to stateful tables)
   ├─ pg_cron ......... timers: expiry, tier escalation, reminders
   ├─ Edge Functions .. external I/O only: send-push (Expo Push API)
   └─ Storage ......... (Phase 2+) profile photos, private bucket
```

## 2. Key decisions (and why)

| # | Decision | Reason |
|---|----------|--------|
| D1 | **Patient is an entity, not a user.** `patients` rows are managed by users through `patient_managers` (`self` or `guardian`). | Many patients are children; guardians act on their behalf. A patient may never have an account. |
| D2 | **State transitions are Postgres RPC functions** (`security definer`, `plpgsql`), not Edge Functions. Edge Functions only for external I/O (push). | Transitions need atomicity and row locks (`select … for update`) to handle concurrent accepts, duplicate requests and races. That is impossible to do safely across an HTTP Edge Function + separate queries. Still fully server-side, as §26a requires. |
| D3 | **Clients never `UPDATE` stateful tables directly.** `insert/update/delete` on `patient_donor_connections`, `blood_requests`, `donor_responses`, `donations`, `audit_logs`, `user_roles` is revoked from `authenticated`; only RPCs change them. | Guarantees state machines and business rules (§28) cannot be bypassed from the client. |
| D4 | **Location = division / district (seeded) + free-text area.** No GPS in MVP. | Privacy; donors in Bangladesh think in districts/upazilas. Radius search is Phase 4. |
| D5 | **Notifications use an outbox table.** RPCs insert into `notifications`; a DB webhook calls Edge Function `send-push`. | Notification intent is transactional with the state change; push delivery can retry independently. |
| D6 | **Configurable product rules live in `app_settings`**, e.g. `max_connected_donors = 6`. | §6, §9: these are product rules, not medical rules. |
| D7 | **Exact blood-group match only** when inviting/searching. No compatibility matrix. | Compatibility/phenotype matching is the blood bank's decision (§2). See OPEN_QUESTIONS Q4. |
| D8 | **Audit log via triggers** on every sensitive table + role grants. Append-only. | §20, §28.13. |
| D9 | **Minimal push payloads.** Push text never contains patient name, diagnosis or hospital. | Lock-screen privacy. Details load in-app after auth. |

## 3. Conventions

- Schema `public`; all tables have `id uuid primary key default gen_random_uuid()` (except 1:1 profile tables keyed by `user_id`), `created_at timestamptz not null default now()`, `updated_at` via trigger where rows mutate.
- **RLS enabled on every table**, no exceptions. Default deny.
- Helper functions are `security definer`, `stable`, `set search_path = ''`, fully-qualified names.
- RPCs: `security definer`, `set search_path = ''`, validate `auth.uid()` is not null, check authorization explicitly, lock rows they transition, write audit, enqueue notifications, return the updated row.
- Function EXECUTE is default-deny: `anon` can execute nothing; `authenticated` gets an explicit `grant execute` only for client RPCs and the helpers RLS policies/views call. Supabase grants EXECUTE on new `public` functions to `anon`/`authenticated` directly, so this must be revoked per role, not only from `PUBLIC` (migration `20260928080000`). `supabase/tests/80_function_privileges.test.sql` pins the allowed list; add every new client RPC there.
- RPC errors: `raise exception using errcode = 'P0001', message = '<error_code>'` where `<error_code>` is a stable snake_case key (e.g. `invalid_transition`, `not_authorized`, `donor_limit_reached`). The app maps it to i18n key `errors.<error_code>`.
- Enums as Postgres `enum` types (listed in §4).
- Generated TS types: `supabase gen types typescript` → `src/lib/database.types.ts` (committed).

## 4. Enums

```sql
app_role            : patient | guardian | donor | organization | admin
blood_group         : A_POS | A_NEG | B_POS | B_NEG | AB_POS | AB_NEG | O_POS | O_NEG
manager_relation    : self | guardian
donor_availability  : available | unavailable | paused
connection_tier     : regular | backup
connection_status   : requested | active | declined | cancelled | paused | removed
connection_initiator: patient_side | donor
request_status      : draft | open | responding | partially_fulfilled | fulfilled | cancelled | expired
request_tier        : regular | backup | broad          -- current escalation stage (Phase 2)
response_status     : invited | accepted | declined | donation_pending | completed | cancelled | expired
donation_verification: guardian_confirmed | org_verified -- (self_reported is NOT a donation; see §7.3)
contact_method      : phone | whatsapp | in_app
```

## 5. Tables — Phase 1

Sketch only; Sonnet writes the real migrations. Constraints listed are required.

### 5.1 Identity & roles
```
profiles                      -- 1:1 with auth.users
  user_id uuid pk → auth.users on delete cascade
  display_name text not null (1..80)
  phone text null              -- E.164, validated
  preferred_contact contact_method not null default 'phone'
  share_contact_on_accept bool not null default false   -- consent, see §9
  language text not null default 'bn' check in ('bn','en')
  district_id int null → districts
  area text null (≤120)
  onboarded_at timestamptz null
  deleted_at timestamptz null

user_roles
  user_id → profiles, role app_role, granted_by uuid null, created_at
  pk (user_id, role)
  -- patient/guardian/donor self-assigned via complete_onboarding / add_role RPC
  -- organization/admin only via admin RPC

divisions (id int pk, name_bn, name_en)                          -- seeded, 8 rows
districts (id int pk, division_id → divisions, name_bn, name_en) -- seeded, 64 rows

app_settings (key text pk, value jsonb not null, description text, updated_at, updated_by)
  seed: max_connected_donors=6, request_expiry_grace_hours=24,
        regular_response_window_hours=6 (Phase 2), donation_reminder_days=120 (Phase 2,
        label as "configurable reminder, not a medical rule"),
        broad_invite_limit=20 (Phase 2a: max donors outside the network invited per request)
```

### 5.2 Patients
```
patients
  id, display_name text not null (≤80)
  blood_group blood_group not null
  thalassemia_type text null           -- voluntary; never shown outside managers unless visibility allows
  treating_centre text null            -- free text in Phase 1; organization_id added in Phase 2
  district_id → districts not null, area text null
  next_transfusion_date date null
  invite_code text unique not null     -- 8 chars, unambiguous alphabet, rotatable
  -- visibility to CONNECTED donors (never to strangers):
  show_treating_centre bool not null default true
  show_area bool not null default true
  show_next_transfusion bool not null default true
  show_thalassemia_type bool not null default false
  created_by uuid → profiles, created_at, updated_at, archived_at null

patient_managers
  patient_id → patients, user_id → profiles
  relation manager_relation not null, is_primary bool not null default false
  created_at; pk (patient_id, user_id)
  -- at most one 'self' per patient; at least one manager while patient not archived
```

### 5.3 Donors & network
```
donor_profiles                  -- 1:1 with a user holding role donor
  user_id pk → profiles
  blood_group blood_group not null
  availability donor_availability not null default 'available'
  available_from date null      -- self-reported
  last_donation_date date null  -- max(self-reported, latest confirmed donation); display only
  emergency_available bool not null default false
  searchable bool not null default false     -- opt-in for broad search (Phase 2)
  created_at, updated_at

patient_donor_connections
  id, patient_id → patients, donor_id → donor_profiles(user_id)
  tier connection_tier not null default 'regular'
  status connection_status not null default 'requested'
  initiated_by connection_initiator not null
  status_changed_at, status_changed_by, end_reason text null
  created_at, updated_at
  unique (patient_id, donor_id) where status in ('requested','active','paused')
  -- count(status in requested/active/paused) per patient ≤ app_settings.max_connected_donors,
  -- enforced inside RPCs under a lock on the patient row
```

### 5.4 Requests, responses, donations
```
blood_requests
  id, patient_id → patients, created_by → profiles
  blood_group blood_group not null        -- defaults from patient, editable
  component text null                     -- see OPEN_QUESTIONS Q5; free text "as advised by hospital"
  units_needed smallint not null check (1..10)  -- number of donors the family was told to arrange
  required_at timestamptz not null
  treating_centre text not null, district_id → districts not null, area text null
  is_emergency bool not null default false
  emergency_acknowledged_at timestamptz null  -- Phase 2a: set on publish when the manager
                                              --   accepted the "not an emergency service" notice
  notes text null (≤500)
  status request_status not null default 'draft'
  current_tier request_tier not null default 'regular'
  tier_changed_at timestamptz null
  published_at, closed_at, cancel_reason text null
  created_at, updated_at
  -- partial unique index to flag duplicates: one non-terminal request per patient per required_at::date
  --   (duplicate → error 'duplicate_request'; see phase-1 tests)

donor_responses
  id, request_id → blood_requests, donor_id → donor_profiles(user_id)
  invited_via request_tier not null
  status response_status not null default 'invited'
  scheduled_at timestamptz null
  donor_reported_donated_at timestamptz null   -- "I donated" claim; NOT completion
  responded_at, status_changed_at, status_changed_by, reason text null
  created_at, updated_at
  unique (request_id, donor_id)

donations                       -- only created by confirm_donation(); immutable afterwards
  id, response_id unique → donor_responses
  request_id, patient_id, donor_id (denormalised for history queries)
  donated_on date not null
  verification donation_verification not null
  confirmed_by → profiles, confirmed_at
  created_at
```

### 5.5 Notifications & audit
```
notifications
  id, user_id → profiles, type text not null   -- e.g. request_invited, response_accepted
  entity_type text, entity_id uuid
  params jsonb not null default '{}'           -- i18n params; no sensitive medical data
  read_at, pushed_at, created_at

push_tokens (user_id, token text, platform text, updated_at; pk (user_id, token))
notification_preferences (user_id, type text, push_enabled bool default true; pk (user_id, type))

audit_logs                      -- append-only; no update/delete grants to anyone
  id bigserial, actor_id uuid null, action text, table_name text, row_id uuid,
  old_data jsonb, new_data jsonb, created_at
```

## 6. Tables — later phases (outline only)

- **Phase 2a** (done): no new tables. Uses `blood_requests.current_tier`/`tier_changed_at`,
  `donor_responses.invited_via`, `donor_profiles.searchable`/`emergency_available` (all
  Phase 1 columns), adds `blood_requests.emergency_acknowledged_at` and the
  `broad_invite_limit` setting. Tiered escalation is in §7.2, broad search in §9.
- **Phase 2 (rest)**: `organizations` (+ `organization_verifications`), `organization_members`,
  `blood_requests.organization_id`, `patients.treating_organization_id`,
  `appreciation_messages`, `community_posts`, `community_comments`, `reports`,
  `user_blocks`, `guardian_invites`, `account_deletion_requests`.
- **Phase 3**: `content_sources`, `awareness_articles` (bn/en body, `review_status`
  draft|in_review|approved|published|retired, `reviewed_by`, `reviewed_at`,
  `next_review_due`), `article_sources` (m:n), `faqs`, `medicine_info` (optional).
- **Phase 4**: aggregate analytics views/materialised views (no row-level personal data).

## 7. State machines

Any transition not listed is rejected with `invalid_transition`. Every transition:
locks the row, sets `status_changed_at/by`, writes audit, enqueues notifications.

### 7.1 Patient–donor connection
```
                 other party accepts
  requested ───────────────────────────▶ active ◀──────┐
     │  │                                  │  ▲        │ resume (either)
     │  └─ other party declines ─▶ declined│  │        │
     └──── initiator cancels ───▶ cancelled│  └─ pause ─┴─ paused
                                           │                │
                                           └──── remove ────┴──▶ removed
```
- "Accepted → Active" from the master prompt is merged into `active` (Q2).
- Patient side (any manager) or donor may pause/resume/remove. Donor "leaving" = `removed` by donor (§28.5). No penalty, no reason required.
- `tier` changes (regular↔backup) by patient side only, while `requested/active/paused`; audited.
- Patient-side request (Phase 2a, `request_connection_to_donor`): a manager asks a donor to join,
  choosing the tier. Allowed only for a donor with the patient's exact blood group who is either
  `searchable` or has accepted a request for this patient. The donor accepts/declines with
  `respond_connection`; the tier the manager chose is kept.
- Limit check (`donor_limit_reached`) runs when a connection is created. Paused connections still count toward the limit, so resuming needs no check.

### 7.2 Blood request
```
 draft ─publish─▶ open ─first accept─▶ responding ─first completed─▶ partially_fulfilled
   │               │                     │                              │
   │               │                     └──── completed ≥ units ───────┴──▶ fulfilled
   └── cancel ─────┴──── cancel ─────────┴───── cancel ──────────────────┴──▶ cancelled
                   └── timer: required_at + grace passed ────────────────────▶ expired
```
- `status` is **derived** by `recompute_request_status(request_id)` after each response change. Only `publish`, `cancel` (manager) and `expire` (cron) set it directly.
- `open` covers the master prompt's "Open/Notified"; `responding` covers "Donor responding/Donor accepted/Donation scheduled". Response-level detail comes from `donor_responses`.
- On publish: create `donor_responses(status=invited)` for invited donors, notify them.
- **Invitation tiers (Phase 2a, `current_tier`)**. Only ever moves forward: `regular → backup → broad`.
  - Normal request: publish invites `active` connections with `tier = regular` (exact blood group,
    availability ≠ `paused`). `current_tier = regular`.
  - Escalation (`process_request_timers`): a non-emergency request at `regular` whose
    accepted + scheduled + completed responses are fewer than `units_needed` moves to `backup`
    when **either** `regular_response_window_hours` have passed since publish **or** no regular
    invite is still unanswered (Q17). Backup-tier connections are invited; managers get
    `request_escalated`.
  - `widen_request_search` (manager): `backup → broad`. Only at `broad` can managers run
    `search_broad_donors` and `invite_broad_donor` (capped by `broad_invite_limit`).
  - Emergency request: publish requires `emergency_acknowledged = true`
    (`emergency_disclaimer_required` otherwise), invites regular **and** backup connections at
    once (`current_tier = backup`). If the manager opts in (`notify_emergency_donors`), it also
    invites donors with `emergency_available = true` in the same district and goes straight to
    `broad` (Q18). Emergency requests never wait for the timer.
  - `invited_via` on each response records which tier invited that donor.
- On `fulfilled`: remaining `invited` → `expired`; remaining `accepted/donation_pending` → `cancelled` (reason `request_fulfilled`), notify.
- On `cancelled`/`expired`: all non-terminal responses → `cancelled`/`expired`, notify.
- Terminal: `fulfilled`, `cancelled`, `expired`.

### 7.3 Donor response
```
 invited ─accept─▶ accepted ─schedule─▶ donation_pending ─confirm (manager)─▶ completed
    │  ▲              │                       │
    │  └─accept─┐     └─ withdraw / cancel ───┴──▶ cancelled
    └─decline─▶ declined
    └─ request closed ─▶ expired / cancelled
```
- **Accept means "I can donate". It never creates a donation** (§28.2).
- `declined → accepted` allowed while request is `open/responding/partially_fulfilled` (misclicks).
- `schedule` (set `scheduled_at`) by donor or manager.
- `report_donated` by donor sets `donor_reported_donated_at` and notifies managers; status unchanged.
- `confirm_donation` by a patient manager from `accepted` or `donation_pending` → `completed` and inserts a `donations` row (`guardian_confirmed`). Phase 4: organizations can confirm (`org_verified`).
- Decline/withdraw carries no penalty and is not shown to other donors (§28.3).
- Conflict rule: a donor with a response in `accepted/donation_pending` on another non-terminal request gets `donor_has_active_commitment` on accept (Q6).

## 8. Authorization matrix (Phase 1)

Helper functions: `has_role(role)`, `is_admin()`, `is_patient_manager(patient_id)`,
`is_connected_donor(patient_id)` (status active/paused), `is_invited_donor(request_id)`.

| Table | select | writes |
|-------|--------|--------|
| profiles | own row; admin; managers↔donors of a shared active connection see `display_name` only (via view `public_profiles`); managers also see `display_name` of any donor invited to one of their patient's requests (Phase 2a, `manages_request_with_donor`) | own row (not `deleted_at`, not roles) |
| user_roles | own; admin | RPC only |
| districts/divisions | everyone authenticated | none |
| app_settings | everyone authenticated | admin RPC |
| patients | managers (full); connected donors via view `patient_cards_for_donor` honoring `show_*` flags; admin | `create_patient`, `update_patient` RPCs (managers) |
| patient_managers | managers of same patient; own rows | RPC |
| donor_profiles | own; admin; managers of connected patients (blood_group, availability, available_from, last_donation_date) | own row (except `last_donation_date` which a trigger maintains) |
| patient_donor_connections | managers of patient; the donor | RPC only |
| blood_requests | managers of patient (full); invited donors via RPC `get_request_for_donor` (minimal fields, §9) | RPC only |
| donor_responses | the donor; managers of the request's patient | RPC only |
| donations | the donor; managers of patient | RPC only |
| notifications | own | `mark_notification_read` RPC |
| push_tokens / notification_preferences | own | own |
| audit_logs | admin | triggers only |

Phase 2a RPCs (all check `is_patient_manager` of the request's/patient's patient):
`widen_request_search`, `search_broad_donors`, `invite_broad_donor`,
`request_connection_to_donor`, and `publish_blood_request(request_id, emergency_acknowledged,
notify_emergency_donors)`. Search and invite also require the request to be at tier `broad`
(`search_not_available_yet`).

Every RPC re-checks authorization; RLS is defence in depth, not the only check.
Test every row of this matrix with pgTAP (allowed **and** denied cases) — this is the IDOR/BOLA protection.

## 9. Privacy model

- Stranger (not connected, not invited): sees nothing about a patient.
- Invited donor for a request (`get_request_for_donor`): blood group, component, units, required_at, treating centre, district, area, emergency flag, patient `display_name` **only if connected**. Never thalassemia type.
- Connected donor: patient card with fields allowed by `show_*` flags.
- Broad search (Phase 2a, `search_broad_donors`): a manager whose request reached `broad` sees
  only donors who opted in (`searchable = true`), with the exact blood group, `availability =
  available`, in the request's district (or its division if widened, Q19). Returned fields:
  donor id, `display_name`, `area`, `district_id`, recent-activity bucket (`week` / `month` /
  `older`). **Never** phone, contact method, donation history or last donation date. At most
  50 rows. The manager can then invite (`invite_broad_donor`, re-checks the same rules); the
  donor sees the request through `get_request_for_donor`, without the patient's name.
- Contact reveal: when a donor accepts, managers and that donor may see each other's `phone` + `preferred_contact` **only if** that user set `share_contact_on_accept = true` (explicit consent in onboarding, changeable in settings). Otherwise in-app only (Phase 2 messaging, Q3).
- No public URLs, no web indexing of any authenticated route (`robots: noindex` on web build).
- Push notification text is generic (D9).

## 10. Notification architecture

1. RPC inserts rows into `notifications` in the same transaction.
2. Supabase Database Webhook on `notifications` INSERT → Edge Function `send-push` (verifies a shared secret header).
3. `send-push` checks `notification_preferences`, loads `push_tokens`, calls Expo Push API, sets `pushed_at`, deletes tokens reported `DeviceNotRegistered`.
4. App shows in-app list from `notifications` (Realtime subscription optional) regardless of push.

Phase 1 types: `connection_requested`, `connection_accepted`, `connection_ended`,
`request_invited`, `request_cancelled`, `request_fulfilled`, `response_accepted`,
`response_declined`, `response_withdrawn`, `donation_reported`, `donation_confirmed`.
Phase 2a adds `request_escalated` (to managers, when a request moves from regular to backup
donors). `request_invited` carries `is_emergency` in `params`, so push can say "urgent" without
any patient detail.

Note: Expo Go on Android cannot receive remote push (SDK 53+). Test push with an EAS development build; everything else works in Expo Go.

## 11. Scheduled jobs (pg_cron)

- `*/10 * * * *` → `process_request_timers()`: expire requests with `required_at + grace < now()`; then escalate non-emergency `regular` requests to `backup` (rules in §7.2).
- Daily (Phase 2) → availability reminders based on `donation_reminder_days` — worded as a reminder to check with the blood bank, never "you are eligible".

## 12. Frontend architecture

```
src/app/                 Expo Router routes: (auth)/, (onboarding)/, (tabs)/, request/[id], ...
src/features/<module>/   api.ts (React Query hooks calling RPCs), components/, screens/, schema.ts (zod)
src/components/          shared UI (Button, Screen, StatusChip, EmptyState, ErrorText, Disclaimer)
src/lib/                 supabase.ts, queryClient.ts, i18n.ts, errors.ts, database.types.ts
src/locales/bn/*.json, src/locales/en/*.json     one namespace per feature
src/stores/              Zustand: session, activeRole, language
```
- Server state: **React Query** (caching, retries, invalidation after RPC mutations). Client state: **Zustand** (tiny, no boilerplate). No Redux.
- Forms: react-hook-form + zod; zod schemas mirror DB constraints.
- UI kit: **react-native-paper** (MD3, accessible, web-compatible). Bangla font: Noto Sans Bengali (expo-google-fonts).
- Primary action on home: patient/guardian → **রক্তের অনুরোধ করুন / Request Blood**; donor → **রক্তের অনুরোধ দেখুন / View Blood Requests**. Users with several roles get a role switcher.
- Accessibility: min 48dp touch targets, respect font scaling, contrast ≥ 4.5:1, `accessibilityLabel` on icon buttons, status never conveyed by colour alone.

## 13. Testing strategy

- **pgTAP** (`supabase/tests/*.test.sql`, `supabase test db`): RLS matrix (allow + deny), every state transition (valid + invalid), limits, duplicates, concurrency-sensitive rules, cancel/expire cascades, deleted/blocked users. Highest priority.
- **Jest (jest-expo) + React Native Testing Library**: zod schemas, error mapping, hooks, key screens.
- **Edge Functions**: `deno test`.
- CI runs lint, typecheck, jest, and `supabase start && supabase test db` (Docker available on GitHub runners).
- Later: Maestro e2e flows on Android.

## 14. Health, privacy, security & legal considerations

- App never decides donor eligibility, dosage, blood quantity, compatibility or genetic status (§2). Copy review checklist in `docs/CONTENT_SAFETY.md` (Phase 3).
- Emergency screen must say the app is not an emergency service and direct to hospital / national emergency number (999 in Bangladesh — verify before release).
- No money fields anywhere; reports category "selling blood" in moderation (§28.11).
- Minors: patients are often children → guardians manage; decide minimum account age (Q8).
- Data protection: review current Bangladesh data-protection law and Google Play health-app + account-deletion policies before public launch (Q9). Account deletion/export in Phase 2.
- Secrets only via env / EAS secrets / GitHub secrets. `service_role` key never in the app.
- Supabase free tier pauses inactive projects; plan paid tier before launch.
