# TRUSTUS Group Website — CONTEXT

Static HTML/CSS/JS site for TRUSTUS Group (client: Sajid Mamu), live at https://trustuscare.com via GitHub Pages. Full conventions (push workflow, design system, page structures, admin portal) are in `CLAUDE.md` at this repo root — read that first.

## Current state (2026-07-22)
- Marketing pages (home, about, 3 service pages, contact, careers) + full job application portal (Supabase + Resend) are live.
- Job portal build phases 1–6 complete; phase 7 (monthly Google Apps Script export) and phase 8 (migrate repo to a dedicated TRUSTUS-owned GitHub account) are pending — see `CLAUDE.md`.
- Footer badge row (`.footer-badges`) has 4 badges: CQC, Disability Confident, DBS Checked, and an unlabelled 4th accreditation logo added 2026-07-22 (see `docs/decisions/0001-footer-accreditation-badge-alt-text.md`).

## Conventions
- Push via the `saad-shaikh14` GitHub account (`gh auth switch -u saad-shaikh14` first — default account 403s).
- Always read/write HTML with Python `encoding='utf-8'` — never PowerShell `Get-Content`/`Set-Content` (double-encodes).
- No hardcoded secrets — Supabase service-role key is fetched on demand via the Management API PAT in `.env.portal` (gitignored), never stored.

Before proposing an alternative approach to something already decided, check `docs/decisions/` first.
