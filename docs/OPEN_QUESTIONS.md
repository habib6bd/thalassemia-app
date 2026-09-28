# Open Questions

Ambiguities in the requirements. Each has a **default** that autonomous
sessions use so work is not blocked. The product owner confirms or changes
them; when answered, move the item to "Decided" with the date.

Agents: if you hit a new ambiguity, add it here with a proposed default and
mention it in the PR description. Do not silently invent business rules.

## Open

| # | Question | Default used until answered |
|---|----------|------------------------------|
| Q1 | Login method? Phone OTP suits Bangladesh but needs a paid SMS provider. | Email + password (with email verification). Phone OTP in a later phase. |
| Q2 | Master prompt has connection states `Requested → Accepted → Active`. Is "Accepted" distinct from "Active"? | Merged: accepting makes the connection `active`. |
| Q3 | How do donor and family contact each other? | Phone/WhatsApp revealed only after the donor accepts, and only for users who opted in (`share_contact_on_accept`). In-app messaging is Phase 2+. |
| Q4 | Should matching use blood-group compatibility (e.g. O− for anyone)? | No. Exact blood-group match only; compatibility is the blood bank's decision. |
| Q5 | Which blood components can be requested? (§13 says they must be medically verified.) | Optional free-text field "as advised by the hospital". No fixed list until a clinician verifies one. |
| Q6 | Can a donor accept two open requests at once? | No. A donor with an `accepted`/`donation_pending` response elsewhere can't accept another until it is completed or cancelled. |
| Q7 | Who can confirm a donation happened? | Any patient manager (guardian/self) in Phase 1; verified organizations from Phase 4. A donor's own "I donated" is a claim, not a confirmation. |
| Q8 | Minimum age for accounts (patients and donors)? | 18+ for account holders. Patients under 18 are managed by a guardian. Donor eligibility age is **not** checked by the app. |
| Q9 | Legal review: Bangladesh data-protection rules, Play Store health-app policy, terms, privacy policy. | Not blocking development. Required before public launch. |
| Q10 | EAS Build trigger in GitHub Actions? | Manual `workflow_dispatch` only. Add "on push to `release` branch" once confirmed. |
| Q11 | Android package name / app display name? | `com.habib6bd.thalassemiaapp`, "থ্যালাসেমিয়া সহায়তা" (placeholder). Changing it after Play Store release is impossible, so confirm before the first store build. |
| Q12 | Where does the admin dashboard live? | The same Expo app under `/admin` routes, used mainly via the web build, and visible only to users with the `admin` role. |
| Q13 | Regular-donor response window before backup donors are notified (Phase 2)? | 6 hours for normal requests. Emergency requests notify regular and backup donors together. Stored in `app_settings`. |
| Q14 | Organization verification: who verifies, what evidence is needed? | Admin checks manually (phone call or official website) and records the method and date. Re-verify every 12 months. |
| Q15 | Emergency number to show on the emergency screen? | 999 (Bangladesh national emergency service). Must be verified before release. |
| Q16 | Sign-up confirmation email links to the Supabase project's Site URL (`http://localhost:3000` by default), because `signUp` passes no `emailRedirectTo`. The link still confirms the account (Supabase verifies before redirecting), but the landing page fails. | For development, "Confirm email" is turned off in the Supabase dashboard. Before launch: pass `emailRedirectTo` with the app's deep link (`thalassemia-app://`), handle the session in the app, and turn confirmation back on. |
| Q17 | When does a request escalate from regular to backup donors? Master prompt §8 says "if insufficient response is received" after a window. | After `regular_response_window_hours` (6h), **or earlier** once no regular invite is still unanswered (all declined, or no regular donors at all) — waiting 6h when nobody can answer helps no one. In both cases only if accepted + scheduled + completed < units needed. |
| Q18 | Which donors outside the network does an emergency request reach? | Only if the manager ticks "also notify nearby emergency donors": donors with `emergency_available = true`, exact blood group, same district, `availability = available`, up to `broad_invite_limit` (20). `emergency_available` is itself the donor's consent to emergency contact, so `searchable` is not required. |
| Q19 | Broad search: how wide, and what counts as "recent activity"? | Same district by default; the manager can widen to the whole division. Activity bucket (this week / this month / older) comes from the later of the donor profile's last update and the donor's last response to any request. No GPS/radius (D4). |
| Q20 | What does a donor see with a thank-you message? | Only the message text and date. No sender or patient name is attached (a broad-search donor may not be connected to the patient, §9). One message per donation, up to 300 characters. The donor can hide it; an admin can remove it. Reporting comes with moderation in 2c. |
| Q21 | What happens to data when someone deletes their account? | The profile is anonymised (name → "Deleted user", phone/area/district removed) and roles, push tokens, notifications and received thank-you messages are deleted. Open responses are withdrawn and connections ended, with no penalty. Patients are handed to another guardian, or, if nobody is left, open requests are cancelled and the patient record is anonymised and archived. Confirmed donation records stay, shown as "Deleted user", and the auth user is soft-deleted. **Open:** `audit_logs` is append-only, so older audit rows still contain earlier values (e.g. patient details). A retention/redaction policy is needed before launch (legal review, Q9). |
| Q22 | How many guardians per patient, and how long does a guardian code last? | Up to 5 managers per patient (`max_patient_managers`); codes work once and expire after 72 hours (`guardian_invite_ttl_hours`). Only the primary guardian can remove others; anyone can leave except the last manager; the patient's own account can't be removed by a guardian. If the primary leaves, the longest-serving guardian becomes primary. |
| Q23 | Profile photos (optional in phase 2b)? | Deferred. They need `expo-image-picker` plus a private Storage bucket and aren't needed for the donor workflow. Revisit together with community profiles in 2c or later. |

## Decided

_(none yet)_
