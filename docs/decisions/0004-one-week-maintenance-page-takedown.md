# ADR 0004: One-week full-site maintenance takedown

## Context
Sajid (client) requested that trustuscare.com be taken offline for one week, starting
2026-08-04, expected back online around 2026-08-11. This includes both the public marketing
pages and the Supabase-backed job portal (`apply.html`, `portal.html`, `test.html`,
`scorecard.html`) — no candidate applications or HR logins should be usable during the window.

## Options considered
1. **Unpublish GitHub Pages** (repo Settings → Pages → disable). Rejected: visitors get a bare
   GitHub 404/no-site error with no explanation; re-enabling can hit a few minutes of DNS/SSL
   cert re-provisioning delay, which is unnecessary risk for a one-week planned window.
2. **DNS-level takedown** (remove/change records at the Squarespace registrar). Rejected: slower
   to take effect and slower to revert (DNS propagation/TTL), and the highest risk of a
   misconfiguration that outlives the intended week.
3. **Maintenance page overwrite** (chosen). Replace the body of every top-level HTML entry point
   with a single static "we'll be back soon" page. DNS, SSL, and GitHub Pages config are never
   touched — only committed file content changes, so it reverts with a single `git revert`.

## Decision
Overwrote the following 11 files in place with an identical, self-contained maintenance page
(inline CSS, no dependency on `css/styles.css`/`js/main.js` so nothing else needs to stay in
sync during the outage): `index.html`, `about-us.html`, `careers.html`, `contact-us.html`,
`domiciliary-care.html`, `supported-living.html`, `complex-care.html`, `apply.html`,
`portal.html`, `test.html`, `scorecard.html`.

The page shows a brand-consistent (sage/terracotta, Nunito) "we'll be back soon" message with
phone (020 3411 1218) and email (info@trustuscare.com) for urgent enquiries, and carries
`<meta name="robots" content="noindex, nofollow">` so search engines don't index the maintenance
copy in place of the real pages during the week.

**Not touched:** `CNAME`, DNS, GitHub Pages settings, Supabase project/Edge Functions/database,
the daily keep-alive workflow (ADR 0002 — still runs, so the Supabase project won't auto-pause
during the outage and is ready to go the moment the real portal pages are restored).

## Consequences
- The contact form, careers form, job application portal, and HR admin login are all
  unreachable via the website for the duration. Only channel for enquiries during this window is
  phone/email (shown on the maintenance page itself).
- No candidate can submit an application or be notified during the outage — same silent-gap
  shape as the Supabase pause incident in ADR 0002, but deliberate and time-boxed this time.
- Reverting is a single step: `git revert` the takedown commit (or restore the 11 files from the
  commit immediately prior) and push. No DNS/SSL/Pages-config changes are needed to bring the
  real site back.
- No automated restore was set up — per standing preference, scheduled/automatic actions are not
  used unless explicitly requested. **Someone must manually trigger the revert on/after
  2026-08-11.**

## Status
Active — live as of 2026-08-04. Revert when Sajid confirms the site should come back (target
~2026-08-11).
