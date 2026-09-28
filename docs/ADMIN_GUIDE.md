# Admin guide

Deliverable §32.11. For people running the service day to day. Admin
screens are in the app under **Profile → Admin** (best used on the web
build) and **Profile → Community moderation**.

## Becoming an admin

The first admin is created in the Supabase SQL editor (see README,
"Community moderation"). After that, admins can give the `admin` role to
others in **Admin → Users & roles**. Nobody can remove their own admin
role, so at least one admin always remains.

## Daily

1. **Notifications** (bell tab). Admins are notified about:
   - community content auto-hidden after reports, and every "selling blood" report;
   - directory entries due for re-verification, or hidden because they are overdue;
   - published awareness content due for re-review.
2. **Community moderation** (Profile → Community moderation). The queue is
   sorted with "selling blood" reports first. For each item:
   - **Keep / restore**: it was fine; reports are dismissed.
   - **Hide**: hidden until you decide; reports are marked actioned.
   - **Remove**: final; the author is notified.
   Add a short note; every action is in the audit log. Content is
   personal experience, never medical advice: remove dosage instructions,
   diagnoses, eligibility claims, money requests and private data.

## Directory (Admin → Organizations & verification)

- **Never add an organization you haven't checked yourself.** Nothing is
  pre-loaded.
- Add the details (phone in `+880…` format, `https://` website, optional
  map point for nearby search), save, then record the verification: how
  you checked (phone call, official website, in person, official document)
  and a note.
- Entries must be re-checked every 12 months. You get a reminder 30 days
  before; overdue entries are hidden until you re-verify.
- **Portal staff**: search a user by email and add them; they get the
  Organization role and can confirm donations for requests linked to that
  organization. Remove staff who leave.
- Reject entries that close or can't be confirmed; patients linked to a
  rejected entry are unlinked.

## Awareness content (Admin → Awareness content)

Follow `docs/CONTENT_SAFETY.md` for every item, in both languages.

1. Open the item (agent drafts are marked "Agent draft").
2. **Sources**: open each linked source (Admin → Sources), confirm it
   supports the text, tick "I opened and checked this source".
3. **Send for review**, then **Approve** (your name is recorded as the
   reviewer), then **Publish**.
4. To correct published content: **Retire**, **Back to draft**, edit,
   review again. Use **Mark re-reviewed** when a yearly review finds no
   changes.

The 10 drafts included with the app have not been checked by a person (the
sources are marked "not yet checked"). Nothing is published until you do
this.

## Users & roles (Admin → Users & roles)

Search by name or email. Only `organization` and `admin` are managed here;
patient, guardian and donor are chosen by users themselves. Deleted
accounts show as "Deleted user".

## Settings (Admin → App settings)

Product rules only (whole numbers 1–10000), audited:

| Setting | Default | Meaning |
| --- | --- | --- |
| `max_connected_donors` | 6 | Donors per patient network |
| `regular_response_window_hours` | 6 | Wait before backup donors are invited |
| `request_expiry_grace_hours` | 24 | Hours after the required time before a request expires |
| `broad_invite_limit` | 20 | Outside donors invited per request |
| `max_patient_managers` | 5 | Guardians per patient |
| `guardian_invite_ttl_hours` | 72 | Guardian code lifetime |
| `community_auto_hide_report_threshold` | 3 | Reports before auto-hide |
| `community_daily_post_limit` | 10 | Posts per user per 24 h |
| `community_guidelines_version` | 1 | Raise to make everyone accept updated guidelines |
| `organization_reverify_months` | 12 | Directory re-verification |
| `organization_reverify_reminder_days` | 30 | Reminder before that |
| `content_review_months` | 12 | Awareness content re-review |
| `analytics_min_cell_size` | 5 | Smallest count shown in analytics |
| `nearby_search_max_km` | 50 | Largest nearby-search radius |
| `donation_reminder_days` | 120 | Donor check-in after a recorded donation (not a medical rule) |
| `transfusion_reminder_days` | 3 | Family reminder before the next transfusion |

If you change the guideline text in the locale files, raise
`community_guidelines_version` so everyone accepts it again.

## Analytics (Admin → Analytics)

Totals and rates only. "Fewer than 5" means the real number is 1–4 and is
hidden for privacy. There is no way to look up a person or a request here,
by design.

## Audit log

Every important change is in `audit_logs` (read it in the Supabase
dashboard; it is append-only). Use it to answer "who changed what, when".

## Account deletion requests

Users delete their own account in Profile. If someone asks you instead,
ask them to use that button (it removes their data safely); do not delete
rows by hand.
