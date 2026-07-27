# ADR 0002: Supabase free-tier auto-pause incident — GitHub Actions keep-alive + health-check alert

## Status
Accepted

## Context
2026-07-27: while investigating an unrelated request ("email HR when an application is received"),
found the Supabase project (`ssbcpblfkgpgtcxifopp`) status was `INACTIVE` via the Management API.
Supabase's free tier auto-pauses a project after 7 days with no database/API activity. The most
recent row in `trustus_applications` was dated 2026-07-03 (24 days prior) and all 4 most recent rows
were internal test submissions, not real candidates — meaning it's possible (not confirmed) that any
genuine candidate who tried to apply in that window hit a silent failure: a paused project can't
accept the `submit-cv` insert, so no row, no error surfaced to HR, no trace at all. Restored the
project manually via the Management API (`POST /v1/projects/{ref}/restore`); confirmed healthy and
serving real queries again ~2.5 minutes later.

Saad confirmed budget is fixed — upgrading to Supabase Pro ($25/mo) specifically to disable
auto-pause is not an option right now.

## Options considered
1. **Upgrade to Supabase Pro** — removes auto-pause entirely. Rejected: explicit cost constraint.
2. **Manual vigilance** (periodically remember to open the dashboard) — rejected: this is exactly
   the failure mode that already happened; relying on memory doesn't scale and gives no alert.
3. **GitHub Actions scheduled ping + Resend alert-on-failure (chosen)** — zero additional cost (both
   GitHub Actions minutes and Resend sends are free at this volume), reuses infrastructure already
   in place for this project. A request that hits the database (not just the API gateway) counts as
   activity for Supabase's pause heuristic, so a daily ping should prevent the pause from recurring
   at all, not just detect it after the fact.

## Decision
Added `.github/workflows/keep-alive-healthcheck.yml` to the `trustus-website` repo:
- Runs daily (`0 8 * * *` UTC) plus on-demand via `workflow_dispatch`.
- Pings `trustus_applications` via the existing public anon key (already shipped client-side in
  `portal.config.js` — not a new secret, no elevated access).
- If the ping doesn't return HTTP 200, sends a failure email to `info@trustuscare.com` via Resend
  (same inbox every other portal notification already uses), naming the returned status and linking
  the Supabase dashboard restore page.
- `RESEND_API_KEY` added as an encrypted GitHub Actions secret on `saad-shaikh14/trustus-website`
  (not committed to the repo) — required the `saad-shaikh14` gh CLI token to be re-authorized with
  the `workflow` OAuth scope, which it didn't have by default (see Consequences).
- Verified end-to-end via manual `workflow_dispatch` run before relying on the schedule — returned
  HTTP 200, alert step correctly skipped.

## Consequences
- The daily ping should make the original pause not recur — this is prevention, not just detection —
  but the email alert stays as a safety net in case a scheduled run is ever missed or the project
  goes down for a reason unrelated to inactivity.
- **New standing fact**: pushing to `.github/workflows/*` on the `saad-shaikh14` account requires the
  `workflow` OAuth scope, which was not present on the existing token (only `gist`, `read:org`,
  `repo`). Fixed via `gh auth refresh -h github.com -s workflow` (interactive device-code flow, run
  by Saad). If a future workflow-file push 403s with "refusing to allow an OAuth App to create or
  update workflow ... without workflow scope," this is the fix, not a repo-permission issue.
- No auto-restore-on-failure was built (would need the Supabase Management API PAT as a second GitHub
  secret) — out of scope for this pass since the ping alone should prevent pause; revisit only if the
  alert ever actually fires.
- Whether any real candidate was lost during the (unknown-length) window this project was paused is
  unresolved — no request log exists to check. Worth asking Sajid directly whether anyone has
  reported applying and not hearing back.
