# 01: Launch pilot administration and controlled access

**What to build:** Launch pilot administration and controlled access as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Administrators can manage invitations, approve or revoke resident pilot access, and grant or revoke validated roles through a protected browser workspace.
- [x] Verified but unapproved residents can browse public records; direct submission and upload requests are denied at the server boundary.
- [x] Categories, destinations, and English/Filipino emergency guidance are editable, validated, and audited; configured active categories appear in submission.
- [x] Last-administrator protection remains enforced; the workspace clearly reports whether two verified administrators are available.
- [x] Audit visibility is restricted, navigation reflects capabilities, and mutations require authoritative server confirmation.
- [x] Existing production roles and category defaults are preserved through safe migration; tests attempt forbidden API actions directly.

## Impeccable delivery requirements

- Use the Impeccable skill during UI implementation; load project context and the appropriate playbook, and read craft-floor immediately before UI edits.
- Preserve the Community Field Ledger identity in PRODUCT.md and DESIGN.md. Operational screens prioritize task clarity and scanability.
- Provide English and Filipino primary copy, validation, and system states; distinguish public and private information clearly.
- Verify phone, tablet, desktop, keyboard focus, screen-reader announcements, zoom, contrast, and reduced motion.
- Cover first use, loading, empty, validation, pending, success, permission denial, offline, retry, and unexpected failure where applicable.
- Perform one batched desktop/mobile visual inspection, fix findings together, then at most one confirmation round. Record evidence.

## Verification and resolution

Use behavior tests at existing application boundaries and browser tests for the delivered journey. Record relevant production checks without exposing credentials or private records. On completion, append an Answer with evidence and update the map. Human or external prerequisites remain explicit gates.

## Answer

Implemented a protected bilingual administration workspace with audited invitations, resident approval/revocation, validated roles, verified-administrator continuity, configuration editing, and restricted audit history. Existing roles/aliases and category defaults are preserved. Participation gates cover report submission and evidence-bearing engagement; direct Storage access remains denied until ticket 02 supplies scoped uploads.

Verified 75 tests, typecheck, production build, changed-code lint, and synthetic Playwright administration workflows at desktop/tablet/phone sizes with zero automated accessibility violations. Standards and Spec reviews were completed and blocking findings fixed.

Evidence and migration guidance: ../../../docs/release/administration-verification.md. The browser fixture does not prove deployed Firebase persistence. Authenticated production checks and human screen-reader/zoom/real-device verification remain explicit ticket 07 release gates. No production rule deployment or invitations were sent.

