# Running autonomous cloud sessions

How to let Claude build a phase while you are offline, then review the result.

## One-time setup

1. Push the repo to GitHub (`habib6bd/thalassemia-app`).
2. Open **claude.ai/code**, connect GitHub, select this repo.
3. Environment: allow network access for package installs (npm, Expo, Supabase CLI).
4. Before Phase 1b you'll need a Supabase project (supabase.com, free tier). Store the URL and anon key
   as environment variables in the cloud environment and as GitHub Actions secrets
   (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Never commit them.
5. Before the first APK build, create an Expo account and add an `EXPO_TOKEN` GitHub secret.
6. Model: choose **Sonnet** for implementation sessions.

## Session prompt template

Copy it, change the part id, and start the session:

```
Implement Phase <PART> (e.g. 0, 1a, 1b …) of this project.

Read CLAUDE.md, then the matching docs/phase-*.md section and only the
ARCHITECTURE.md sections it lists. Do not read the whole master prompt.

Work fully autonomously — do not stop to ask questions. Use the defaults in
docs/OPEN_QUESTIONS.md; add new ambiguities there with a proposed default.

Finish with: lint, typecheck, tests passing (and supabase test db if Docker is
available), checklist items ticked, then commit to branch phase-<PART>-<slug>
from dev and open a PR into dev with a summary, tests run, open questions,
and known gaps.
```

## Order

`0` → `1a` → `1b` → `1c` → `1d` → (test on a phone) → `2a` → `2b` → `2c` → `2d` → `3` → `4`

Start the next part only after you have reviewed and merged the previous PR.

## Reviewing each PR (about 10 minutes)

- CI is green.
- The PR's "open questions" list: answer them in `docs/OPEN_QUESTIONS.md`.
- For DB PRs, skim the RLS policies and pgTAP deny tests. For extra safety, run
  `/security-review` or `/code-review` in a local Claude Code session.
- For UI PRs, run `npx expo start --tunnel` and click through the flow on your phone.
- Any medical wording must match the rules in CLAUDE.md.

## Cost tips

- One part per session. Small PRs are cheaper and easier to review.
- If a session goes wrong, close it and start fresh with a narrower prompt
  rather than arguing in a long context.
- Use Opus only for re-planning or reviewing security-critical code.
