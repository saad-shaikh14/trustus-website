# ADR 0003: Competency test second-chance retakes with attempt history; silent HR-email-failure fix

## Status
Accepted

## Context
Two related requests: (1) HR wasn't confident the "application received" notification email was
actually reaching `info@trustuscare.com`, and (2) HR wanted the ability to give a candidate a second
attempt at the competency test if they think the candidate deserves another chance — with the new
result becoming official without losing the old one.

Investigating (1) surfaced the real Supabase pause incident (ADR 0002) as the probable underlying
cause, plus a separate, real code bug once the Edge Function source was actually inspected:
`submit-cv`, `submit-form1`, and `submit-mcq` all sent their HR-notification email via a bare
`await fetch(...)` with no `.ok` check and no error logging — a Resend failure on that specific call
was completely silent (same category of bug as the 2026-07-01 client-side unawaited-write fix,
never generalized to these calls).

For (2): `submit-mcq` already did an insert-or-update keyed on `application_id` alone, so a second
submission already overwrote the first in place — but with zero history, and `submit-scorecard`
shared the same single-row assumption for the *interviewer's* assessment (domain ratings, outcome,
etc.), which is a logically separate thing from the MCQ score but lived in the same row.

## Options considered
1. **Keep plain overwrite, no history** — simplest, but loses the old score entirely; rejected
   per Saad's explicit answer ("keep old attempt, mark superseded") when asked.
2. **New table for MCQ attempts, separate from the interviewer scorecard fields** — cleanest
   long-term separation of concerns, but a bigger schema change (splitting a table that other code
   already depends on) for a two-feature request; deferred, not rejected outright — worth doing if
   this area gets touched again.
3. **Add `attempt_number` + `superseded_at` to the existing table, carry scorecard fields forward
   on each new attempt (chosen)** — smallest change that gets real attempt history without losing
   the interviewer's assessment on a retake, and without a data migration to a new table.

## Decision
- Migration `supabase/migrations/20260727200000_competency_results_attempt_history.sql`: adds
  `attempt_number` (default 1) and `superseded_at` (nullable) to `trustus.competency_results`; adds
  a partial unique index enforcing at most one non-superseded ("current") row per application;
  recreates the `public.competency_results` view (not `SELECT *`, so it doesn't pick up new columns
  automatically) and re-grants `anon`/`authenticated`/`service_role` privileges lost by the
  `DROP`+`CREATE`. Applied directly against the live project via the Management API, then written
  back as this versioned file (matches the project's established "run directly, verify, commit
  after" pattern).
- `submit-mcq`: on each submission, looks up the current (non-superseded) row for the application.
  If one exists, marks it `superseded_at = now()` and inserts a new row with `attempt_number + 1`,
  carrying forward `domain_ratings`/`strengths`/`development_areas`/`outcome`/`interviewer_name`/
  `completed_at` from the old row (the interviewer's assessment isn't about a specific MCQ attempt,
  so a retake shouldn't erase it). If none exists, inserts attempt 1 as before. HR email now checks
  `.ok` and logs on failure; subject/body note the attempt number when > 1.
- `submit-scorecard`: same silent-failure category didn't apply here (it errors and returns 500 on
  a DB failure already), but its `existing` lookup and insert now target the current row
  specifically (`is('superseded_at', null)`) — without this, a second MCQ attempt would leave two
  rows per application and `.maybeSingle()` would throw ("multiple rows returned") the next time
  a scorecard was saved.
- `submit-cv`, `submit-form1`: added the same `.ok` check + `console.error` logging to their
  HR-notification `fetch()` calls, matching the pattern the candidate-facing email in `submit-cv`
  already used.
- `portal.html`: the Overview query now filters `is('superseded_at', null)` so it always shows the
  current attempt; a new query fetches superseded attempts (only when the current attempt number is
  > 1, to avoid an extra query for the common case) and renders them as a "Previous attempts" list
  under the score card. The "Generate Competency Test Link" button/modal relabels itself to "Give
  Second Chance (Regenerate Test)" with different explanatory copy when a result already exists,
  so HR understands what clicking it will do before they do it — no new button, same underlying
  `generate-scorecard-token` call as before (it just returns the test link; the attempt-history
  logic lives entirely in `submit-mcq`).
- Deployed all 4 changed functions and verified end-to-end against the live project: submitted the
  test twice for an existing test application, confirmed the DB left exactly one current row
  (`superseded_at IS NULL`) and one superseded row, and that both the "current" and "history" reads
  the portal will run return the expected data.

## Consequences
- HR can now give a genuine second chance without losing the record of the first attempt, and the
  interviewer's scorecard (if already saved) survives a retake untouched.
- The three HR-notification email paths now at least log a failure instead of swallowing it
  silently — this doesn't guarantee delivery, but a future Resend outage will show up in the
  function logs instead of just feeling unreliable with no evidence either way.
- `submit-scorecard`'s behavior is now coupled to "there is exactly one current row" — enforced at
  the DB level by the new partial unique index, so a bug that ever left two current rows would fail
  loudly (constraint violation) rather than corrupting data silently.
- Deferred: splitting the MCQ attempt data from the interviewer scorecard into separate tables
  (option 2) — worth revisiting if this area needs further changes, not needed for this request.
