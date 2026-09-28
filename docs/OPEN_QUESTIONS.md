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

## Decided

_(none yet)_
