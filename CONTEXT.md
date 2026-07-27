# TRUSTUS Group Website — CONTEXT

Static HTML/CSS/JS site for TRUSTUS Group (client: Sajid Mamu), live at https://trustuscare.com via GitHub Pages. Full conventions (push workflow, design system, page structures, admin portal) are in `CLAUDE.md` at this repo root — read that first.

## Current state (2026-07-22)
- Marketing pages (home, about, 3 service pages, contact, careers) + full job application portal (Supabase + Resend) are live.
- Job portal build phases 1–6 complete; phase 7 (monthly Google Apps Script export) and phase 8 (migrate repo to a dedicated TRUSTUS-owned GitHub account) are pending — see `CLAUDE.md`.
- Footer badge row (`.footer-badges`) has 4 badges: CQC, Disability Confident, DBS Checked, and an unlabelled 4th accreditation logo added 2026-07-22 (see `docs/decisions/0001-footer-accreditation-badge-alt-text.md`).

## Current state (2026-07-27) — Supabase pause incident + keep-alive workflow (ADR 0002)
- **The Supabase project had auto-paused from inactivity** (free-tier 7-day rule) — discovered while
  investigating an "HR isn't getting notified" request. Restored manually; confirmed healthy. Last
  real DB row before restore was dated 2026-07-03 — 24 days of no recorded activity, raising a real
  possibility that genuine candidates hit silent failures in that window (unconfirmed, no request log
  exists to check either way).
- `supabase/functions/*` source (9 deployed functions, including 2 orphaned ones —
  `validate-scorecard-token`, `submit-scorecard-token` — not previously known) pulled down from the
  live project and is now actually committed to this repo for the first time. Previously only a
  `supabase/.temp/linked-project.json` had ever been committed, despite a commit message claiming
  "add Edge Functions" — the real source existed only on Supabase's servers.
  - `submit-cv`, `submit-form1`, `submit-mcq` all send their HR-notification email via a bare
    `await fetch(...)` with **no `.ok` check and no error logging** — unlike the candidate-facing
    email in `submit-cv`, which does check. Confirmed as a real, latent silent-failure gap (same
    category as the client-side unawaited-write bug fixed 2026-07-01) — not yet fixed, next up.
  - `submit-mcq` currently does insert-or-update keyed on `application_id` alone — a second MCQ
    submission today already overwrites the first in place, with no attempt history. Second-chance
    retake feature (in progress) needs `attempt_number` + `superseded_at` added before this is safe
    to expose as a deliberate HR action.
- **Budget constraint confirmed**: Supabase Pro ($25/mo, which would disable auto-pause outright) is
  not an option right now — see ADR 0002 for why a free GitHub Actions workaround was chosen instead.
- Added `.github/workflows/keep-alive-healthcheck.yml`: daily ping to keep the DB active (should
  prevent the pause recurring at all, per Supabase's documented activity heuristic) + a Resend email
  to `info@trustuscare.com` if the ping ever fails anyway. Verified working via manual
  `workflow_dispatch` run (HTTP 200, alert step correctly skipped). See ADR 0002 for full detail,
  including a new gotcha: pushing workflow files via the `saad-shaikh14` account needed its gh token
  re-authorized with the `workflow` OAuth scope, which it didn't have by default.

## Current state (2026-07-27, continued) — test attempt history + HR-email fix (ADR 0003)
- `competency_results` now supports multiple attempts per application (`attempt_number` +
  `superseded_at`), so HR can give a candidate a second chance on the competency test without
  losing the first attempt's score. The interviewer scorecard fields carry forward across a retake
  since they assess the candidate overall, not one specific attempt.
- The "Generate Competency Test Link" button in the portal relabels to "Give Second Chance
  (Regenerate Test)" with different modal copy once a result already exists — no new button, same
  underlying link-generation call.
- Fixed the silent HR-notification-email failure gap found while investigating this (`submit-cv`,
  `submit-form1`, `submit-mcq` all now check `.ok` and log on failure — previously none of them did).
- Verified end-to-end against the live project (real second submission, confirmed exactly one
  current + one superseded row, confirmed the portal's exact anon-key queries return the right data).
- See ADR 0003 for full detail, including why the interviewer-scorecard/MCQ-attempt split into
  separate tables was deferred rather than done now.
- Produced `docs/TRUSTUS_Portal_HR_Guide.docx` (generator: `docs/build_hr_guide.py`) — a full,
  non-technical A-to-Z walkthrough for Sajid covering login, every portal button, the competency
  test (including the new second-chance flow), the scorecard, statuses, the candidate timeline,
  what each automated email means (including the new health-check-failure alert from ADR 0002 —
  told to forward that one to Saad immediately), and who to contact for each failure mode. Verified
  against the actual current code (statuses, button labels, email content) rather than written from
  memory — confirmed e.g. that `test_complete`/`shortlisted` statuses exist only as unused filter
  options, nothing ever sets them.
- **Contact/careers-interest form activation status resolved, not just documented (2026-07-27).**
  This had been an unresolved "UNKNOWN" open item since 2026-06-19 (see
  `project-trustus-contact-form` in memory). Sent a real test submission through the live
  `formsubmit.co/ajax/info@trustuscare.com` endpoint (spoofing the `Referer`/`Origin` headers
  `curl` doesn't send by default, which formsubmit.co requires) and got back a plain success
  response, not a "confirm your email" message — suggesting it's likely already activated, but
  this can't be fully confirmed without checking the actual inbox, which only Sajid can do. Added a
  guide section (1.4) telling him exactly what to check for (the test message, subject "Activation
  Check — Please Disregard," vs. an unclicked FormSubmit confirmation email) and what to do either
  way. Don't re-mark this fully resolved in memory until Sajid confirms which one he actually found.
- **Status (2026-07-27): waiting on Sajid's feedback on the guide + everything fixed today.** Saad's
  plan — if Sajid confirms it all looks good (including the form-activation check above), this
  project moves toward being closed out. Don't start new speculative work on this repo until that
  feedback lands.

## Conventions
- Push via the `saad-shaikh14` GitHub account (`gh auth switch -u saad-shaikh14` first — default account 403s).
- Always read/write HTML with Python `encoding='utf-8'` — never PowerShell `Get-Content`/`Set-Content` (double-encodes).
- No hardcoded secrets — Supabase service-role key is fetched on demand via the Management API PAT in `.env.portal` (gitignored), never stored.

Before proposing an alternative approach to something already decided, check `docs/decisions/`
first — ADR 0002 records the Supabase pause incident, why a paid plan was rejected, and the
keep-alive workflow's exact mechanics (including the `workflow` OAuth scope gotcha).
