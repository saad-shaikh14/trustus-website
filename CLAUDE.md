# TRUSTUS Group Website

Static HTML/CSS/JS website for TRUSTUS Group (client: Sajid Mamu).

## Site location
`trustus/` subfolder — all HTML, CSS, and JS files live here.

## Live deployment
- **GitHub:** https://github.com/saad-shaikh14/trustus-website
- **Live URL:** https://trustuscare.com (custom domain via Squarespace DNS → GitHub Pages)
- Push to `master` branch → GitHub Pages auto-deploys in ~1 min

## Push workflow
```
cd trustus/
git add .
git commit -m "description"
git push
```
Must switch account first: `gh auth switch -u saad-shaikh14` (default account is sshaikh-jpg and will get 403)
gh CLI is at `C:\Program Files\GitHub CLI\gh.exe` — add to PATH in PowerShell: `$env:PATH += ";C:\Program Files\GitHub CLI"`

## Business structure
- **TRUSTUS Group** — parent
- **BrightLife Home Care** → `domiciliary-care.html`
- **Stanmore Supported Living** → `supported-living.html` (1 property, 4 rooms)
- **Monica Supported Living** → `complex-care.html` (1 property, 6 rooms)

> Stanmore and Monica are each ONE property with multiple rooms — never split into separate fake addresses.

## Contact details
- Phone: 020 3411 1218 (landline, updated 2026-06-19)
- Email: info@trustuscare.com (restored 2026-06-29)
- Address: Office G24, 47 Clarendon Road, Watford, Hertfordshire, WD17 1HP

## Design system
- Shared CSS: `trustus/css/styles.css`
- Shared JS: `trustus/js/main.js`
- Colours: white `#FFFFFF`, sage `#3D6A5A`, rose/terracotta `#C8526A`
- Fonts: **Nunito only** — all elements (headings, body, labels, buttons). Cormorant Garamond fully removed (including h3 in CSS).
- Hero overlays: blush `rgba(250,232,236,0.85)` with navy text — all pages

## Service page hero pattern (locked in)
All service pages (domiciliary, supported-living, complex-care) follow this structure:
- Hero contains: h1 title + description paragraph + "X includes:" label + checklist
- NO separate intro section below the hero — content lives inside the hero overlay
- Single static background image (no slideshow on service pages except domiciliary)

## Supported Living page structure
1. Hero: h1 + intro + "Our support includes:" + 8 bullet points
2. Our Properties — Stanmore: `background:var(--bg-soft)` (cream)
   - Gallery main: `stanmore-2.jpg` | 4 thumbs: 1,3,8,6 | lightbox: 6 images (excludes dark shots 4&7)
   - Last thumb: `+1` overlay
3. Our Properties — Monica: `background:var(--terracotta-soft)` (blush), `id="monica"`
   - Gallery main: `monica-8.jpg` | 4 thumbs: 1,2,3,6 | lightbox: 8 images
   - Last thumb: `+3` overlay
4. Footer
- Removed: Who We Support, Referrals sections

## Complex Care page structure
1. Hero: h1 + description + "Our experienced staff are trained to support:" + 9-item checklist + care plan note
2. How We Help: eyebrow + h2 + description + services checklist (text only, no images)
3. Who We Support: 6 icon cards
4. Footer

## Gallery +N overlay
Last thumbnail in property galleries shows a count of hidden images:
- `.more-overlay` span inside last `.property-thumb`
- CSS: `position:absolute; inset:0; background:rgba(28,43,74,0.58); color:#fff; font:700 1.3rem Nunito; border-radius:6px;`

## Favicon
- `images/favicon-32.png` (32×32) — browser tab
- `images/favicon-180.png` (180×180) — Apple touch icon
- Source: `logo_theme_2_recolored_C8526A_4k_transparent.png` (icon-only, no text)
- Generated with Pillow: auto-crop whitespace → LANCZOS resize

## Card & icon system (must stay consistent across ALL pages)
All card types (`.icon-box`, `.support-card`, `.process-step`) share identical styling:
- Padding: `32px 26px`, border-radius: `var(--radius-lg)`
- Border top: `3px solid var(--terracotta)`
- Box shadow: `var(--shadow-sm)`, hover lifts `6px` to `var(--shadow-md)`
- Icons: **120px × 120px**, `margin: 0 auto 18px`
- Grid gap: `24px`

## Icons
- All client-provided PNGs — do NOT replace with custom SVGs
- Source: `docx_media/word/new media rose color/` — HD 4096×4096 PNGs already in rose `#C8526A`
- Deployed size: **240×240px** (2× for HiDPI at 120px CSS), resized with LANCZOS via Pillow
- Who We Support icons: icon-learning, icon-autism, icon-mental-health, icon-partnership, icon-behaviour, icon-complex-support, icon-transition
- Getting Started icons: icon-get-in-touch (step 1), icon-free-assessment (step 2), icon-care-begins-2 (step 3)

## HTML encoding rules
- Always read/write HTML files with Python `encoding='utf-8'` — NEVER use PowerShell Get-Content/Set-Content (causes double-encoding)
- Use HTML entities for all special chars: `&mdash;` `&middot;` `&rarr;` `&#9662;` `&times;`
- No BOM — files must be saved as plain UTF-8

## Nav
Top-level items: Home, Our Services (dropdown), About Us, Contact Us, Careers
Dropdown under Our Services: Domiciliary Care, Supported Living, Complex Care (3 items only)

## Admin portal login
- URL: https://trustuscare.com/portal
- Login email: info@trustuscare.com (updated 2026-07-01, was hr@trustuscare.com)
- HR notification emails (new CV, Form 1 complete) → info@trustuscare.com

## Careers page
- File: `careers.html`
- **Current:** Expression of interest form via formsubmit.co (temporary) — `id="careersForm"`, success div `id="careersSuccess"`
- JS handler in `js/main.js` — POSTs to formsubmit.co, subject "New Career Enquiry — [role]"
- Roles: Care Coordinator, Field Care Worker, Learning Disability Support Worker
- Fields: firstName, lastName, phone (required), email (required), role (required), CV attachment (non-functional — formsubmit.co drops files)
- Full portal live (see below) — careers.html still used as public entry point

## Job portal (LIVE 2026-06-30)
- Stack: Supabase (Postgres + Auth + Storage) + Resend — all free tier
- Supabase project: `ssbcpblfkgpgtcxifopp`, dashboard: https://supabase.com/dashboard/project/ssbcpblfkgpgtcxifopp
- CV files: Supabase Storage bucket `cvs` (signed URLs, 120s expiry); downloaded as `FirstName_LastName_CV.ext`
- Emails: Resend via noreply@trustuscare.com (API key held by Saad, set as Edge Function secret)
- DB schema in `trustus` schema (not `public`); public views bridge PostgREST: `trustus_applications`, `trustus_application_details`, `competency_results`
- Edge Functions (Deno, all `--no-verify-jwt`): `submit-cv`, `submit-form1`, `send-invite`, `submit-mcq`, `submit-scorecard`, `generate-scorecard-token`
- No candidate accounts — token-based links only; HR is only authenticated user (info@trustuscare.com)
- Application statuses: `cv_received` → `form1_complete` → `test_complete` → `shortlisted` → `interview_invited` → `rejected`

**DB schema — `trustus.applications`:**
id, token, status, first_name, last_name, phone, email, role_applied, cv_url, submitted_at, created_at, updated_at, form1_submitted_at, hr_notes, cv_downloaded_at, invited_at

**DB schema — `trustus.competency_results`:**
application_id (FK), mcq_score, section_scores (jsonb), answers (jsonb), mcq_submitted_at, domain_ratings (jsonb), strengths, development_areas, outcome, interviewer_name, completed_at, score_viewed_at
- `outcome` check constraint: `'PASS'`, `'HOLD'`, `'FAIL'` (uppercase — must match exactly)

**Portal UX (as of 2026-06-30):**
- Status: read-only badge; only manual action is "✖ Not Progressing" (confirm dialog → `rejected`)
- Send Invite: enabled for all statuses except `cv_received` and `rejected`; CV download auto-opens invite modal 600ms after (all non-rejected candidates)
- Generate Competency Test Link: visible for `form1_complete`, `test_complete`, `shortlisted`, `interview_invited`; copies `test.html#token=xxx` to clipboard (fragment, not query string — see Security note below)
- View Test Results: shown when `mcq_score` is not null; opens answer-review modal (if `answers` null, shows score summary only)
- Scorecard tab: appears for `shortlisted`, `interview_invited`, `rejected` — 5 domain ratings + outcome + save
- Application Timeline: always shown; 6 events — CV submitted, Form 1 complete, HR downloaded CV, invite sent, test submitted, HR viewed results

**Phase 7 (pending):** Monthly Google Apps Script — `monthly_export.gs` at project root
- Set SERVICE_ROLE_KEY and DRIVE_FOLDER_ID in the script, paste into Google Apps Script, add monthly trigger

**Security — token delivery (fixed 2026-07-01):** Candidate/interviewer links (`apply#token=`, `test.html#token=`, `scorecard.html#token=`) use a URL **fragment**, not a `?token=` query string. Fragments are never sent to any server (not logged by GitHub Pages/CDN, not included in `Referer` headers to third-party resources like Google Fonts). Client JS moves the token to `sessionStorage` and strips it from the address bar via `history.replaceState` on load; old query-string links still work via fallback. `validate-token` edge function is POST-only (token in JSON body) — GET+query-param was removed so the token never appears in a request URL/logs. All pages carry `<meta name="referrer" content="no-referrer">` as defense in depth. `scorecard.html` + `validate-scorecard-token`/`submit-scorecard-token` are currently orphaned (not linked from anywhere; portal.html's Scorecard tab replaced them) but were fixed to the same standard and kept per Sajid's/Saad's call 2026-07-01.

**GDPR note:** Supabase free tier is US-hosted (AWS us-east-1). GDPR-compliant via SCCs + UK-US Data Bridge. For strict EU data residency: upgrade to Pro ($25/mo) and select Frankfurt region.

## Contact form backend
- **Service:** formsubmit.co (free, no backend)
- **File:** `contact-us.html` — form `id="contactForm"`, success div `id="formSuccess"`
- **JS handler:** `js/main.js` — POSTs JSON to `https://formsubmit.co/ajax/info@trustuscare.com`
- **Subject line:** "New TRUSTUS Care Enquiry"
- **Activation:** One-time — first submission triggers a confirmation email to `info@trustuscare.com`; Sajid must click the link. Status as of 2026-06-30: **unknown** (separate from job portal which uses Resend and is confirmed working). Test by submitting contact form — if activation email arrives, click it; if normal enquiry email arrives, already active.
- Fields captured: firstName, lastName, phone, email, enquiryType, service, message

## Placeholders (client to replace)
- Stock images on domiciliary and complex care pages — swap with real photos when ready
- Property photos already supplied: stanmore-1..8.jpg, monica-1..8.jpg
