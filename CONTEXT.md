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

## Conventions
- Push via the `saad-shaikh14` GitHub account (`gh auth switch -u saad-shaikh14` first — default account 403s).
- Always read/write HTML with Python `encoding='utf-8'` — never PowerShell `Get-Content`/`Set-Content` (double-encodes).
- No hardcoded secrets — Supabase service-role key is fetched on demand via the Management API PAT in `.env.portal` (gitignored), never stored.

Before proposing an alternative approach to something already decided, check `docs/decisions/`
first — ADR 0002 records the Supabase pause incident, why a paid plan was rejected, and the
keep-alive workflow's exact mechanics (including the `workflow` OAuth scope gotcha).
