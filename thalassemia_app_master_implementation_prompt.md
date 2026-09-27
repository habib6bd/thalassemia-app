# Thalassemia Patient Support, Donor Network & Awareness Platform

## Master Implementation Prompt

You are an experienced product architect, UX designer, full-stack
engineer, database designer, security engineer, and technical project
manager.

I want you to build a complete application for Bangladesh that helps
thalassemia patients and their families find and maintain a reliable
blood-donor network, while also providing patient/guardian support and
scientifically accurate thalassemia awareness and carrier-screening
education.

This is a real-world health-related application. Do not invent medical
facts, clinical rules, hospitals, doctors, pharmacies, statistics, or
treatment recommendations. Whenever medical information is required, use
authoritative and current sources and clearly distinguish educational
information from medical advice.

## 1. Core Vision

Do not build this as only a "blood donor finder".

The application should have three connected goals:

1.  Help existing thalassemia patients find and maintain a trusted
    network of regular and backup blood donors.
2.  Help patients, guardians, and donors communicate, share practical
    experiences, and support one another.
3.  Increase public awareness about thalassemia, carrier status,
    premarital screening, genetic counselling, and prevention.

The overall concept is:

**Find a donor → Build a trusted donor network → Support patients →
Educate families → Promote carrier awareness**

The application must remain useful even when a patient already has
donors, because the long-term donor relationship, backup network,
patient support, and prevention education are important parts of the
product.

------------------------------------------------------------------------

# 2. Important Medical-Safety Principle

The application must not diagnose users, prescribe medicines, determine
whether somebody is medically eligible to donate blood, determine an
individual's genetic status, or replace a doctor, transfusion
specialist, blood bank, or genetic counsellor.

For example:

-   Do not tell a donor that they are medically eligible simply because
    enough time has passed since their previous donation.
-   Do not tell a patient how much blood they personally need.
-   Do not interpret a laboratory/genetic result as a medical diagnosis
    unless an appropriate verified clinical workflow is explicitly
    designed for that purpose.
-   Do not recommend or change medicines.
-   Do not make individual treatment decisions.
-   Do not present user-generated hospital or treatment experiences as
    medical facts.

Where appropriate, the application should direct users to qualified
healthcare professionals and verified treatment/blood-bank services.

Medical and genetic educational content must be reviewed against
authoritative sources before publication.

------------------------------------------------------------------------

# 3. Main User Roles

Design the application around at least these roles:

### Patient

A person living with thalassemia who needs ongoing transfusion support.

### Guardian

A family member or caregiver managing requests, appointments, donor
communication, or patient information.

### Donor

A voluntary blood donor who can support one or more patients according
to their own availability and applicable medical/blood-bank rules.

### Healthcare/Verified Organization

Optional future role for approved hospitals, thalassemia centres, blood
banks, diagnostic services, or genetic counselling providers.

### Administrator

Manages users, verification, reports, educational content,
organizations, donor/patient relationships, and system settings.

Do not assume that every patient must personally manage the application.
Guardians must be able to perform appropriate actions on behalf of
patients.

------------------------------------------------------------------------

# 4. Patient Profile

Design a privacy-conscious patient profile containing only information
that is actually needed.

Possible fields:

-   Name/display name
-   Profile photo (optional)
-   Blood group
-   Thalassemia diagnosis/type, only if voluntarily provided and
    appropriately verified where required
-   Treating hospital/centre
-   City/area
-   Guardian information
-   Emergency contact
-   Transfusion-related information that the patient chooses to share
-   Next expected transfusion date/request date
-   Preferred contact method
-   Donor-network status

Avoid collecting unnecessary sensitive medical information.

Give users control over what information is visible to donors,
guardians, or the wider community.

------------------------------------------------------------------------

# 5. Donor Profile

A donor profile should include:

-   Name/display name
-   Blood group
-   Location/area
-   Availability status
-   Preferred contact method
-   Connected patients
-   Donation history
-   Last recorded donation date
-   Next self-reported availability date, where appropriate
-   Emergency/urgent-request availability
-   Privacy controls

The application should not independently decide whether the donor is
medically eligible to donate. Eligibility must remain subject to the
blood bank/medical service's screening and rules.

------------------------------------------------------------------------

# 6. Patient--Donor Network

A major feature is the ability for a patient to build a long-term donor
network.

A patient should be able to have a preferred group of regular and backup
donors.

I initially want a maximum of **6 connected regular/backup donors per
patient**, but treat this as a configurable product rule rather than a
medical requirement.

Example:

Patient A:

-   Donor 1 --- regular
-   Donor 2 --- regular
-   Donor 3 --- regular
-   Donor 4 --- regular
-   Donor 5 --- backup
-   Donor 6 --- backup

The patient should not need to find a completely new person every time
blood is required.

A donor may choose to support a specific patient repeatedly.

A donor should also be able to see which patients they are connected
with, subject to privacy and consent.

------------------------------------------------------------------------

# 7. Donor Request Workflow

Design the complete workflow:

**Patient/Guardian creates request** → Required blood information →
Preferred transfusion date/time → Hospital/centre → Location → Urgency →
Connected donors notified → Donor accepts/declines → Donation status
updated → Request completed

Possible statuses:

-   Draft
-   Open
-   Notified
-   Donor responding
-   Donor accepted
-   Donation scheduled
-   Donation completed
-   Partially fulfilled
-   Fully fulfilled
-   Cancelled
-   Expired

The system should never falsely mark blood as donated merely because a
donor clicked "Accept".

There should be a clear distinction between:

**I can donate** and **Donation was actually completed**

Where possible, completion should be confirmed by the patient/guardian
or verified organization.

------------------------------------------------------------------------

# 8. Donor Priority and Backup Logic

When a patient raises a request:

1.  Notify connected regular donors first.
2.  Give them a reasonable response window.
3.  If insufficient response is received, notify backup donors.
4.  If still unfulfilled, allow a broader donor search/request.
5.  Support urgent requests separately.

Do not automatically expose sensitive patient information to strangers.

Only expose the minimum information required for a donor to decide
whether they can help.

------------------------------------------------------------------------

# 9. Donation Frequency and Availability

Do not hard-code a rule such as "every donor can donate every four
months" as a universal medical rule.

Instead:

-   Track the donor's previous donation date.
-   Allow the donor to report availability.
-   Show reminders based on configurable guidance.
-   Clearly state that actual donation eligibility is determined by the
    blood bank/medical screening process.

The system should help with scheduling and reminders, not make clinical
eligibility decisions.

------------------------------------------------------------------------

# 10. Blood Request Search

If a patient's connected network cannot fulfill a request, the
application should support a wider donor search.

Possible filters:

-   Blood group
-   Location
-   Availability
-   Distance/radius
-   Connected/verified donor status
-   Recent activity
-   Emergency availability

Do not expose a donor's private contact information automatically.

Prefer an in-app request/consent workflow.

------------------------------------------------------------------------

# 11. Patient and Guardian Community

Create a moderated community where patients and guardians can share
practical experiences.

Possible topics:

-   Treatment-centre experience
-   Transfusion experience
-   Managing regular transfusions
-   Family experiences
-   Emotional support
-   Financial/support resources
-   Practical information for newly diagnosed families
-   Questions for the community

Important:

User-generated experiences must be clearly labelled as personal
experiences.

Do not allow community posts to become an uncontrolled source of medical
prescriptions or dangerous treatment advice.

Include:

-   Report
-   Block
-   Moderation
-   Medical misinformation reporting
-   Admin review
-   Community guidelines

------------------------------------------------------------------------

# 12. Donor Appreciation

Include non-monetary appreciation features.

Examples:

-   Donation history
-   Thank-you messages
-   Patient/guardian appreciation messages
-   Donation milestones
-   Reminders
-   Recognition badges, if appropriate

Do not create a paid blood marketplace.

The product should promote voluntary donation and human connection.

------------------------------------------------------------------------

# 13. Serial / Blood / Donation Records

Design records carefully so that a donation event is not confused with a
blood request.

For each request, maintain:

-   Patient
-   Request date
-   Required component
-   Blood group
-   Hospital/centre
-   Required date
-   Donor
-   Donor response
-   Donation confirmation
-   Completion date
-   Verification status
-   Notes

If component-level information is used, it must be medically accurate
and verified before implementation.

------------------------------------------------------------------------

# 14. Thalassemia Awareness Module

This is one of the most important parts of the application.

Create a dedicated educational section covering:

### What is thalassemia?

Simple Bangla explanations.

### What is a carrier?

Explain that a carrier may not have thalassemia disease and may not have
obvious symptoms.

### Why carrier screening matters

Explain the purpose of screening before marriage/family planning without
using fear-based messaging.

### If both partners are carriers

Explain the genetic inheritance concept using a simple educational
diagram.

Do not give personalized genetic counselling through an automated
calculator.

### Genetic counselling

Explain what it is and when someone may want to discuss testing and
reproductive options with a qualified professional.

### Screening

Explain that people should discuss appropriate screening/testing with
qualified healthcare professionals.

All educational content must be reviewed against authoritative medical
sources before being published.

------------------------------------------------------------------------

# 15. Awareness Content Style

The awareness section should be:

-   Bangla-first
-   Simple
-   Visual
-   Short
-   Evidence-based
-   Non-judgmental
-   Culturally appropriate
-   Easy for people with limited medical knowledge

Possible educational messages:

"দেখতে সম্পূর্ণ সুস্থ হলেও কেউ thalassemia carrier হতে পারেন।"

"বিয়ের আগে carrier status সম্পর্কে জানা গুরুত্বপূর্ণ হতে পারে।"

"দুইজন carrier হলে ভবিষ্যৎ সন্তানের genetic risk সম্পর্কে একজন qualified
doctor/genetic counsellor-এর সঙ্গে কথা বলা উচিত।"

Do not shame people who did not screen.

Do not tell people whom they should or should not marry.

The goal is informed awareness and access to professional counselling.

------------------------------------------------------------------------

# 16. Interactive Carrier Awareness

Consider an educational inheritance simulator.

Example:

Person A: Carrier Person B: Carrier

Show a simple inheritance diagram explaining the possible genetic
outcomes.

This must be clearly labelled:

**Educational example --- not a personal medical/genetic risk
assessment.**

Do not collect unnecessary genetic information merely to run the
simulator.

Also create a "Learn about carrier screening" journey rather than a
misleading "Are you a carrier?" diagnostic quiz.

------------------------------------------------------------------------

# 17. Family Awareness

When appropriate, provide educational information that families can
discuss with healthcare professionals.

For example:

-   Family history
-   Carrier screening
-   Genetic counselling
-   Marriage/family planning
-   Screening of relatives where medically appropriate

Do not automatically tell a user that every family member must be
tested.

Use wording such as:

"Ask your doctor or genetic counsellor whether screening is appropriate
for you or your family."

------------------------------------------------------------------------

# 18. Hospital / Treatment Centre Directory

Create a verified directory for:

-   Thalassemia treatment centres
-   Hospitals
-   Blood banks
-   Diagnostic centres
-   Genetic counselling services
-   Relevant support organizations

Each organization should have:

-   Name
-   Address
-   Location/map
-   Phone
-   Website, if verified
-   Services
-   Opening hours, if verified
-   Verification status
-   Last verified date

Do not invent organizations or contact information.

Provide an admin workflow for verification and periodic re-verification.

------------------------------------------------------------------------

# 19. Medicine Information

If a medicine information section is included, it must be informational
only.

Possible information:

-   Generic name
-   General purpose
-   Official/verified information source
-   Why a doctor may prescribe it
-   Important safety notes
-   Where verified information can be found

Never allow the application to prescribe, change dosage, or tell a
patient to start/stop a medicine.

Do not claim that a medicine is available at a pharmacy unless the
information has been verified and is current.

------------------------------------------------------------------------

# 20. Privacy and Security

This is a health-related application, so privacy must be treated as a
first-class feature.

Implement:

-   Secure authentication
-   Role-based access
-   Minimum necessary data collection
-   Consent-based profile visibility
-   Private patient medical information
-   Secure donor communication
-   Audit logs for sensitive actions
-   Account deletion/export process where appropriate
-   Protection against unauthorized access
-   Rate limiting
-   Secure password handling
-   Input validation
-   Server-side authorization
-   Protection against IDOR/BOLA
-   Secure file upload if documents/photos are supported
-   Encryption in transit
-   Appropriate encryption/storage protection for sensitive data

Do not expose patient medical information through public URLs or search
engines.

------------------------------------------------------------------------

# 21. Notification System

Support:

-   Blood request notification
-   Donor response notification
-   Request reminder
-   Donation completion reminder
-   Connected patient update
-   Emergency request
-   Community notification
-   Educational content notification
-   Donor availability reminder

Allow users to control notification preferences.

------------------------------------------------------------------------

# 22. Emergency Request

Create a clear emergency workflow.

An emergency request should display:

-   Emergency status
-   Required blood information
-   Hospital/centre
-   Required time
-   Patient/guardian contact method
-   Location

Do not imply that the app itself is an emergency medical service.

For life-threatening situations, direct users to the relevant emergency
medical service/hospital.

------------------------------------------------------------------------

# 23. Admin Dashboard

Create an admin dashboard for:

### Users

-   Patients
-   Guardians
-   Donors
-   Organizations
-   Verification

### Blood Requests

-   Active
-   Pending
-   Completed
-   Cancelled
-   Emergency

### Donor Network

-   Connections
-   Reported abuse
-   Suspicious activity

### Community

-   Posts
-   Reports
-   Moderation

### Awareness Content

-   Articles
-   Educational cards
-   FAQs
-   Translation
-   Sources
-   Review status

### Organizations

-   Hospital
-   Blood bank
-   Diagnostic centre
-   Counselling service
-   Verification

### Analytics

Only collect privacy-conscious aggregate metrics.

Examples:

-   Active patients
-   Active donors
-   Blood requests
-   Fulfillment rate
-   Average response time
-   Completed donations
-   Number of connected donor networks
-   Awareness content engagement

------------------------------------------------------------------------

# 24. Recommended Product Structure

Design the application around these main modules:

1.  Authentication
2.  Patient/Guardian Profile
3.  Donor Profile
4.  Patient--Donor Network
5.  Blood Request
6.  Donation Tracking
7.  Emergency Request
8.  Community
9.  Awareness & Education
10. Carrier Awareness
11. Hospital/Blood Bank Directory
12. Notifications
13. Admin
14. Privacy/Consent
15. Reporting/Moderation

------------------------------------------------------------------------

# 25. MVP Scope

Before building everything, define an MVP.

The MVP should prioritize:

### Phase 1

-   Authentication
-   Patient profile
-   Guardian profile
-   Donor profile
-   Blood group
-   Location
-   Patient--donor connection
-   Blood request
-   Donor accept/decline
-   Request completion
-   Notifications

### Phase 2

-   Backup donor network
-   Emergency requests
-   Donation history
-   Community
-   Moderation
-   Verified organization directory

### Phase 3

-   Awareness content
-   Carrier education
-   Interactive inheritance education
-   Genetic counselling directory
-   Family awareness

### Phase 4

-   Advanced analytics
-   Organization portal
-   Verification workflows
-   More automation
-   Mobile/PWA improvements

Do not build all advanced features before the core donor-request
workflow is stable.

------------------------------------------------------------------------

# 26. Technical Implementation Process

Before writing code:

### Step 1 --- Inspect the existing project

If this prompt is being given inside an existing codebase:

-   Inspect the complete project structure.
-   Identify frontend framework.
-   Identify backend framework.
-   Identify database.
-   Identify authentication system.
-   Identify existing UI/component system.
-   Identify deployment environment.
-   Identify existing APIs.
-   Identify existing tests.
-   Identify existing coding conventions.

Do not replace the existing architecture without a strong technical
reason.

### Step 2 --- Create a technical plan

Before implementation, document:

-   Architecture
-   Database schema
-   Entity relationships
-   API design
-   Authentication/authorization
-   Notification architecture
-   Privacy model
-   Role/permission model
-   State transitions
-   Error handling
-   Testing strategy
-   Deployment strategy

### Step 3 --- Design the database

At minimum, consider entities such as:

-   users
-   patient_profiles
-   guardian_profiles
-   donor_profiles
-   organizations
-   patient_donor_connections
-   blood_requests
-   donor_responses
-   donations
-   notifications
-   community_posts
-   community_comments
-   reports
-   awareness_articles
-   educational_content_sources
-   organization_verifications
-   audit_logs

Do not create unnecessary tables merely because they are listed here.
Adapt the schema to the existing architecture.

### Step 4 --- Define state machines

Explicitly define state transitions for:

**Patient--Donor Connection**

`Requested → Accepted → Active → Paused/Removed`

**Blood Request**

`Draft → Open → Responding → Partially Fulfilled → Fulfilled / Cancelled / Expired`

**Donor Response**

`Invited → Accepted / Declined → Donation Pending → Completed / Cancelled`

Do not allow arbitrary status changes that can corrupt the history.

### Step 5 --- Build backend first

Implement:

-   Database migrations
-   Models
-   Authentication
-   Authorization
-   APIs
-   Validation
-   Audit logging
-   Notification events
-   Tests

All important business rules must be enforced server-side.

### Step 6 --- Build frontend

Create a simple, accessible, mobile-first interface.

The primary action for a patient should be obvious:

**Request Blood**

The primary action for a donor should be obvious:

**View Blood Requests**

### Step 7 --- Add awareness content

Only publish medical content after source verification.

Every medical educational article should have:

-   Source
-   Publication/review date
-   Reviewer status
-   Last updated date

### Step 8 --- Add moderation and privacy

Before public launch:

-   Reporting
-   Blocking
-   Consent
-   Access control
-   Privacy settings
-   Admin moderation
-   Audit logs
-   Security testing

### Step 9 --- Testing

Test:

-   Unit tests
-   API tests
-   Authorization tests
-   Integration tests
-   Notification tests
-   Mobile responsive UI
-   Accessibility
-   Security
-   Data privacy
-   Edge cases
-   Concurrent blood requests
-   Duplicate requests
-   Donor accepting multiple conflicting requests
-   Cancelled requests
-   Expired requests
-   Deleted users
-   Blocked users
-   Unauthorized access

### Step 10 --- Deployment

Prepare:

-   Environment variables
-   Database migration
-   Production configuration
-   Logging
-   Error monitoring
-   Backups
-   HTTPS
-   Security headers
-   Rate limits
-   Database backup/restore procedure

Do not expose secrets in source code.

------------------------------------------------------------------------

# 26a. Confirmed Technical Stack

The following technology decisions are final for this project. Do not
propose alternative frameworks unless a specific, serious technical
blocker is found — in that case, stop and explain the blocker before
switching anything.

## Frontend

- **React Native with Expo (managed workflow)**
- Target platforms, in order: **Android first**, iOS added later,
  web as a secondary/optional target using the same codebase
  (`expo start --web` / `expo export --platform web`).
- Write components in a way that stays web-compatible where
  reasonably possible, so enabling the web target later does not
  require a rewrite. Do not over-invest in web-specific polish now.
- Use **TypeScript**, not plain JavaScript.
- State management: prefer well-established, simple patterns
  (e.g. React Query for server state, Zustand or Redux Toolkit for
  client state) appropriate to the complexity of each module. Explain
  the choice when first introducing it.
- i18n: Bangla as primary language, English as secondary, using a
  standard i18n library (e.g. i18next). All user-facing strings must
  go through the i18n layer from the start, not be hardcoded.

## Backend / Database

- **Supabase** (Postgres + Auth + Row-Level Security + Edge Functions
  + Storage), using the **free tier** initially.
- The relational schema described in Section 26, Step 3 of this
  document should be implemented as Postgres tables with proper
  foreign keys and constraints — do not flatten this into a
  document/NoSQL structure.
- All business rules that matter for data integrity, privacy, or
  safety (see Section 28, "Important Business Rules") must be
  enforced at the database/API layer using:
  - Row-Level Security (RLS) policies for access control per role
    (patient, guardian, donor, admin, organization).
  - Supabase Edge Functions for logic that cannot be expressed as a
    simple RLS policy — e.g. donor priority notification ordering,
    blood request state transitions, audit log writes.
  - Do not rely on client-side (app) logic alone to enforce any rule
    listed in Section 28.
- State machines (patient–donor connection, blood request, donor
  response — see Section 26, Step 4) must be enforced server-side,
  rejecting invalid transitions rather than trusting the client.
- Authentication: use Supabase Auth. Map Supabase's auth users to the
  application's role model (patient / guardian / donor / organization
  / admin) via a profile table, not by overloading Supabase's own
  user metadata for authorization decisions.

## Hosting / Domain

- No custom domain will be purchased yet. Use Supabase's default
  generated project URL and Expo/EAS default app identifiers for now.
  Design the app so a custom domain can be added later without code
  changes (i.e. don't hardcode the Supabase URL — use environment
  variables).

## Build & CI/CD

- Use **EAS Build** (Expo Application Services) for producing
  installable builds.
  - Android: produce an installable **APK** for testing, and note
    where the config would change to produce an **AAB** for eventual
    Play Store submission.
  - iOS: configure the project so an iOS build is possible later via
    EAS Build's cloud iOS compilation, without requiring local Mac
    hardware. Do not attempt to produce an actual iOS build now —
    just do not do anything that would block it later (e.g. avoid
    Android-only native modules without a cross-platform equivalent).
- Set up a **GitHub Actions workflow** that:
  - Runs tests and lint on every push/PR.
  - Can trigger an EAS Build for Android on demand (manual workflow
    dispatch) or on merges to a designated branch (e.g. `main` or a
    `release` branch) — propose the exact trigger and ask for
    confirmation rather than assuming.
  - Uploads the resulting APK as a downloadable build artifact /
    GitHub Release so it can be installed on a phone without any
    local build step.
- For day-to-day development/testing (not full builds), support
  running the Expo dev server in tunnel mode
  (`npx expo start --tunnel`) so the app can be tested live via the
  Expo Go app on an Android phone, without requiring the developer's
  machine and phone to be on the same network. Document this in the
  setup instructions.

## Environment & Secrets

- All Supabase keys, API keys, and other secrets must be handled via
  environment variables / EAS secrets / GitHub Actions secrets —
  never committed to the repository, per Section 20 and Section 26,
  Step 10.
- Provide a `.env.example` file documenting required environment
  variables without real values.

## What to do with this addendum

At the start of the "First Task" phase (Section 33), confirm this
stack against the existing project state (if any code already
exists), note any conflicts, and proceed with this stack as the
default unless a conflict requires discussion.

------------------------------------------------------------------------

# 27. UX Requirements

The application should work well for users who may not be highly
technical.

Use:

-   Bangla as the primary language
-   English as an optional language
-   Large readable text
-   Simple forms
-   Clear status indicators
-   Minimal steps
-   Mobile-first design
-   Accessible colour contrast
-   Clear error messages
-   Simple emergency workflow

Avoid making the user fill in unnecessary information.

------------------------------------------------------------------------

# 28. Important Business Rules

Implement these rules carefully:

1.  A donor cannot be considered medically eligible by the app.
2.  A blood request cannot be marked completed merely because a donor
    accepted it.
3.  A donor can decline a request without penalty.
4.  A patient can remove or replace a connected donor.
5.  A donor can leave a patient network.
6.  A patient should be able to maintain backup donors.
7.  Patient medical information must not become public by default.
8.  Community content must be moderated.
9.  Medical claims must have reliable sources.
10. User-generated medical experiences must be clearly identified as
    personal experiences.
11. The app must not become a marketplace for buying/selling blood.
12. Emergency requests must not create the impression that the app
    replaces emergency medical services.
13. All important historical actions should remain auditable.

------------------------------------------------------------------------

# 29. Product Philosophy

The application should feel like:

**"A trusted support network around a patient"**

rather than:

**"A database of random blood donors."**

A successful long-term relationship might look like:

``` text
Patient
   ↓
Regular Donor Network
   ↓
Blood Request
   ↓
Donor Response
   ↓
Donation
   ↓
Donation History
   ↓
Future Requests
```

And separately:

``` text
Patient / Family
   ↓
Education
   ↓
Carrier Awareness
   ↓
Screening Information
   ↓
Genetic Counselling
   ↓
Informed Family Decisions
```

------------------------------------------------------------------------

# 30. Success Criteria

The product should ultimately make these things easier:

### For a patient

"I know who I can contact when I need blood."

### For a donor

"I can support a patient I know and receive clear requests when help is
needed."

### For a guardian

"I don't have to start from zero every time blood is needed."

### For a newly diagnosed family

"I can find reliable information and understand what questions to ask a
doctor."

### For the wider public

"I understand what thalassemia and carrier status are and why screening
awareness matters."

------------------------------------------------------------------------

# 31. Development Rule

Do not implement the entire application in one uncontrolled step.

Work in clearly defined phases.

For every phase:

1.  Explain what will be built.
2.  Identify database changes.
3.  Identify API changes.
4.  Identify frontend changes.
5.  Implement the phase.
6.  Run tests.
7.  Check for regressions.
8.  Report what was completed.
9.  Report any unresolved issues.
10. Only then continue to the next phase.

If something is ambiguous, do not silently invent a business rule.
Identify the ambiguity and propose options.

Do not delete or rewrite existing functionality unless it is necessary
and explicitly justified.

Keep changes modular and reversible.

------------------------------------------------------------------------

# 32. Final Deliverables

When implementation is complete, provide:

1.  Working application
2.  Database schema/migrations
3.  API documentation
4.  User roles and permissions documentation
5.  Business rules documentation
6.  Setup instructions
7.  Environment variable documentation
8.  Testing report
9.  Security/privacy checklist
10. Medical-content source/review process
11. Admin guide
12. Deployment guide
13. Known limitations
14. Recommended future improvements

------------------------------------------------------------------------

# 33. First Task

Do not start by writing code immediately.

First:

1.  Inspect the existing project/codebase.
2.  Understand the current architecture.
3.  Identify what already exists and what can be reused.
4.  Create the proposed architecture and database design.
5.  Create the phased implementation plan.
6.  Identify any requirements that need clarification.
7.  Identify health, privacy, security, and legal considerations.
8.  Present Phase 1 and wait for approval only if the
    environment/workflow requires human approval.

If the coding environment explicitly expects autonomous execution,
proceed phase-by-phase while keeping the implementation reversible and
reporting each completed phase.

The goal is to build a practical, secure, privacy-conscious,
Bangladesh-focused thalassemia patient support and donor-network
platform---not merely a blood-donor directory.

## Reference sources for medical/background verification

Use current authoritative sources when implementing or writing medical
educational content. These are starting references, not permission to
copy content without verification:

-   WHO --- Thalassaemia and other haemoglobinopathies:
    https://www.who.int/health-topics/thalassaemia
-   CDC --- Thalassemia: https://www.cdc.gov/thalassemia/
-   International Thalassaemia Federation: https://thalassaemia.org.cy/
-   NCBI/PubMed Central --- Bangladesh thalassemia prevalence and
    prevention literature:
    https://pmc.ncbi.nlm.nih.gov/articles/PMC12247199/
-   NCBI/PubMed Central --- transfusion support and alloimmunization
    guidance/literature:
    https://pmc.ncbi.nlm.nih.gov/articles/PMC9345633/

Always verify current guidance before publishing medical content in the
application.
