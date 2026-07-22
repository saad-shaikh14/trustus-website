# 0001 — Footer accreditation badge: alt text left empty pending confirmed name

## Context
On 2026-07-22 a new accreditation/certification logo (client-provided `logo-02.svg`, saved as `images/badge-accreditation.svg`) was added to the footer badge row (`.footer-badges`) across all 8 site pages, alongside the existing CQC / Disability Confident / DBS badges. Those 3 existing badges use descriptive `alt` text naming the accreditation body. When asked what this new logo represents, the requester declined to specify and asked that no descriptive text be added.

## Options considered
1. **Guess the accreditation name** from the SVG's visual style and write descriptive alt text matching the other 3 badges.
   - Rejected: this is a live client site (trustuscare.com) for a regulated care provider. Alt text asserting a specific regulatory/accreditation body is a factual claim — guessing wrong risks publishing an inaccurate compliance claim.
2. **Leave `alt=""`** (treat as decorative).
   - Chosen.
3. **Omit the badge** until the name is confirmed.
   - Rejected: explicitly requested to be added now, in this session.

## Decision
Added the badge as `<img src="images/badge-accreditation.svg" alt="" class="footer-badge">`, styled identically to the other 3 badges (same `.footer-badge` class), placed last in the row on all 8 pages: `index.html`, `about-us.html`, `contact-us.html`, `careers.html`, `apply.html`, `domiciliary-care.html`, `supported-living.html`, `complex-care.html`.

## Consequences
- Screen readers will skip the image (decorative), which under-serves users if the logo does represent a real accreditation that should be announced.
- Follow-up required: once the accreditation name is confirmed, update `alt` on all 8 pages to a descriptive string consistent with the other 3 badges.

## Status
Accepted — follow-up (accurate alt text) pending confirmation of what the logo represents.
