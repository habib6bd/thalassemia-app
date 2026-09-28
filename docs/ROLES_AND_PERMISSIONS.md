# Roles and permissions

Deliverable §32.4. The full table-by-table matrix is ARCHITECTURE §8; every
row there has allowed **and** denied pgTAP tests. This page is the summary
for product owners and reviewers.

## Roles

| Role | How someone gets it | What it is for |
| --- | --- | --- |
| `patient` | Chooses it in onboarding / Profile | Manages their own patient record ("self"). |
| `guardian` | Chooses it, or accepts a guardian invite code | Manages patient records on someone's behalf (up to 5 managers per patient). |
| `donor` | Chooses it, then fills in the donor profile | Joins patient networks, answers requests. |
| `organization` | Admin adds them as staff of a verified organization | Organization portal: confirms donations at their centre. |
| `admin` | Another admin (the first one via SQL, see README) | Moderation, directory verification, content review, settings, analytics. |

A person can hold several roles (e.g. guardian and donor). Deleted accounts
can't regain any role.

## What each role can see

| Data | Patient / guardian (manager) | Donor | Organization staff | Admin | Anyone else |
| --- | --- | --- | --- | --- | --- |
| Patient record | Full, for their patients | Card of connected patients, only fields the family allowed (`show_*`) | Display name on linked requests | Full | Nothing |
| Blood request | Full, own patients | Minimal fields when invited (no thalassemia type; name only if connected) | Minimal fields when linked to their verified organization | Full | Nothing |
| Donor profile | Blood group, availability of connected donors | Own | Donor display name on linked requests | Full | Nothing |
| Phone number | Only after the donor accepts **and** the other person opted in | Same rule | Never | Full | Never |
| Donor location | Never (distance bands only in nearby search) | Own | Never | Never | Never |
| Community | Published posts (not from blocked users) | Same | Same | All, incl. hidden | Nothing (sign-in required) |
| Awareness content | Published only | Published only | Published only | All, incl. drafts | Nothing |
| Analytics | – | – | – | Aggregates only, small counts hidden | – |
| Audit log | – | – | – | Read only | – |

## What each role can do (all through RPCs, see `docs/API.md`)

- **Managers**: create/edit patients, invite guardians, rotate invite codes,
  manage donor connections (accept, pause, remove, set tier), create /
  publish / cancel requests, widen search, search and invite broad or
  nearby donors, confirm donations (`guardian_confirmed`), send thank-you
  messages, link a verified treating centre.
- **Donors**: join networks by code, accept/decline connection requests,
  answer requests ("I can donate" is never a donation), schedule, report
  "I donated", leave networks, share an approximate location, turn
  reminders on/off.
- **Organization staff**: list requests linked to their verified
  organization, confirm donations there (`org_verified`).
- **Admins**: moderate community content, manage directory entries and
  their verification and staff, review and publish awareness content,
  manage `organization`/`admin` roles, edit product settings, read
  analytics and the audit log.
- **Everyone signed in**: community posting (after accepting the
  guidelines), reporting, blocking, data export, account deletion.

## Enforcement

- RLS on every table; `anon` can read nothing; views are read-only
  (`supabase/tests/05_security_invariants.test.sql`).
- Stateful tables change only through `security definer` RPCs with
  `search_path = ''` that check `auth.uid()` and the caller's right.
- Function EXECUTE is an allow-list (`supabase/tests/80_function_privileges.test.sql`).
- Important changes are written to the append-only `audit_logs`.
