# Known limitations and recommended future improvements

Deliverables §32.13 and §32.14. Decisions behind many of these are in
`docs/OPEN_QUESTIONS.md`.

## Known limitations

**Content and data**
- No awareness article is published yet: the 10 drafts must be checked by
  a qualified person against the sources, which the build environment
  could not open (Q35). The fixed texts of the inheritance example and the
  screening journey need the same review.
- The directory is empty until admins add and verify real organizations.
- Community guideline text was drafted by an agent and needs review.

**Product**
- Sign-in is email + password only; phone OTP needs a paid SMS provider (Q1).
- No in-app messaging between families and donors; contact is by phone,
  only with consent (Q3).
- Profile photos are not supported (Q23).
- Published content can't be edited in place: it goes offline while being
  corrected (Q34).
- Requests are linked to an organization through the patient; there is no
  per-request picker screen (Q29).
- Organizations can't upgrade a guardian-confirmed donation to
  organization-verified (Q40); donor identity verification is not built (Q41).
- Nearby search needs the request's organization to have map coordinates;
  there is no general map or GPS radius around the family (Q42, D4).
- Community, directory, Learn, organization portal and admin are reached
  from Home/Profile, not the tab bar; six tabs already truncate labels on
  small phones (Q26, Q32).
- Views counts are per opening, not unique readers (Q38).

**Technical**
- Maestro flows and the iOS build have not been run (no emulator or Apple
  account in the build environment). Push delivery is untested end to end.
- The web build is functional but not polished (no offline support / no
  service worker; desktop layouts are the mobile layout).
- Analytics are computed on demand (fine for thousands of rows; add
  materialised views for large volumes).
- `audit_logs` has no retention/redaction policy yet (Q21).
- 999 as the emergency number must be verified (Q15); email confirmation
  is off for development (Q16).
- Load numbers come from one container; hosted limits are untested.

## Recommended future improvements

1. **Navigation redesign** to five tabs (Home, Requests, Network, Learn,
   Profile) with a header bell (Q32).
2. **Phone OTP sign-in** with a Bangladeshi SMS gateway; **in-app
   messaging** so phone numbers are rarely needed.
3. **Content versioning** so corrections stay live until re-approved;
   two-person review rule (Q34, Q36).
4. **Offline-friendly PWA** (service worker, cached Learn content) and a
   desktop layout for the admin web.
5. **Localised emergency info** per district (verified hotlines and blood
   banks from the directory, never invented).
6. **Donor verification** process agreed with blood banks (Q41), and
   organization-side request creation for patients treated there.
7. **Accessibility audit** with TalkBack/VoiceOver and Bangla screen
   readers; larger touch targets on dense admin screens.
8. **Observability**: error reporting (Sentry), Edge Function logs and
   alerts on failed pushes / cron jobs.
9. **Data retention**: audit-log redaction after deletion, automatic
   expiry of stale locations (Q43) and old notifications.
10. **Scale**: materialised analytics, connection pooling review and a
    hosted load test before a national launch.
