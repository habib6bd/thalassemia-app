# Content Safety Checklist

Applies to every piece of medical or awareness text in the app: articles,
FAQs, medicine information (Admin → Awareness content), and the fixed
educational text in the locale files (`learn.*` keys: the inheritance
example and the carrier-screening journey). Master prompt §2, §14–§17, §19,
§28; CLAUDE.md rules 1, 9 and 10.

A reviewer approves an item only if **every** box below is true, in **both**
Bangla and English.

## 1. It never decides for the reader

- [ ] No diagnosis ("you have…", "your child is…").
- [ ] No donor eligibility ("you can/can't donate", intervals between donations).
- [ ] No blood quantity, component or compatibility advice.
- [ ] No medicine choice, dose, start/stop or change instructions. Medicine
      entries give only the generic name, general purpose, why a doctor may
      prescribe it, general safety notes and an official source (§19).
- [ ] No personal genetic status or risk. The inheritance example stays a
      fixed, labelled example and never takes personal input (§16).
- [ ] No claims that a medicine or blood is available anywhere.

## 2. Tone

- [ ] Non-judgmental. Nobody is blamed or shamed for having, or not having,
      been screened (§15).
- [ ] Never tells anyone whom to marry or not to marry (§15).
- [ ] No fear messaging, no dramatic statistics without a source.
- [ ] Does not say every relative must be tested; uses wording such as "ask
      your doctor or genetic counsellor whether screening is appropriate for
      you or your family" (§17).
- [ ] Simple, short, Bangla first; suitable for readers with limited medical
      knowledge.

## 3. Sources and review

- [ ] At least one linked source, and every linked source has been opened
      by a person and marked checked (the app enforces this).
- [ ] Every factual statement is supported by a linked source. Nothing is
      invented: no hospitals, organizations, phone numbers, statistics or
      medical facts that the sources don't state (CLAUDE.md rule 10).
- [ ] Numbers (e.g. "1 in 4") match the source and say which situation they
      describe.
- [ ] The Bangla and English versions say the same thing.
- [ ] Ends by pointing to a doctor, genetic counsellor or treatment centre
      where a decision is involved.

## 4. Workflow

1. Draft (agents may only produce drafts; they are marked "Agent draft").
2. Send for review.
3. A human reviewer checks this list, the sources and both languages, then
   approves (their name and date are recorded).
4. Publish. The item shows its sources, review date and last-updated date.
5. Re-review before `next_review_due` (12 months, `content_review_months`);
   admins get a reminder. Retire anything that is no longer correct.

Published items can't be edited in place: retire, move back to draft, edit,
and review again.

## 5. Text outside the CMS

The inheritance example and the screening journey have short fixed texts in
`src/locales/{bn,en}/common.json` (`learn.simulator*`, `learn.outcome.*`,
`learn.journey*`, `learn.disclaimer`, `learn.medicineDisclaimer`). They
were drafted by an agent and must pass this checklist before the first
public release (OPEN_QUESTIONS Q35).
