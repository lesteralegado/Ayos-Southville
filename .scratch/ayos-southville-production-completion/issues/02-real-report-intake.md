# 02: Complete real report intake with evidence and location

**What to build:** Complete real report intake with evidence and location as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 01: Launch pilot administration and controlled access

**Status:** resolved

- [x] An approved resident completes category selection, description, landmark, duplicate choice, draft recovery, and submission receipt using production data.
- [x] Compressed photos are stored as actual private Firebase Storage files with randomized paths, bounded count/size/type, ownership checks, and server validation.
- [x] Upload previews, removal, progress, retry, and interrupted-upload recovery work; report submission accepts only completed owned uploads.
- [x] MapLibre provides a real location picker using a policy-compliant tile provider with attribution; landmark and coordinate entry remain usable without a map.
- [x] Exact private coordinates and household details remain operator-only; public coordinates are deliberately approximate.
- [x] Duplicate suggestions use privacy-safe real reports; idempotent submission recovers ambiguous network outcomes without duplicate reports.
- [x] Tests cover upload denial, private access, failed storage, interrupted drafts, and accessible non-map submission.

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

Implementation delivered: production-default Firebase private byte uploads, server image decoding/metadata stripping, randomized paths, bounded count/type/size, ownership and draft validation, atomic canonical attachment, recoverable scoped drafts/blobs, progress/retry/removal with cancellation tombstones, real optional MapLibre, coordinate/landmark alternatives, public-only duplicate suggestions, and stable receipt recovery even after category deactivation. Original reporter access to their own private record is retained; other residents never receive exact coordinates or household details.

Verified **100 tests in 29 files**, typecheck, production build, changed-code lint, and controlled browser flows with real photo bytes. The bounded Impeccable inspection covered desktop/tablet/phone and English/Filipino; automated axe checks passed at all three sizes, with keyboard focus, reduced motion, 200% text zoom, and no overflow. A subsequent functional-only run verified MapLibre 6's explicit worker integration without adding a third visual round. The built server returned 401 for unauthenticated photo/receipt APIs and redirected report intake to sign-in.

Standards and Spec reviews against user-approved baseline `13402e8` are clear after correcting the category-deactivation receipt regression and consolidating deletion logic. Evidence and operational instructions: [intake-verification.md](../../../docs/release/intake-verification.md).

**The checked items describe delivered implementation, not a production launch certification.** Local configuration has Firebase project/Admin keys but no `FIREBASE_STORAGE_BUCKET`. Provision/confirm the private bucket and IAM, configure correct Vercel environments, deploy/verify deny-by-default Storage rules, schedule abandoned-file cleanup, and complete consented deployed two-account and manual assistive/real-device checks before launch. No production upload, data mutation, rule deployment, cleanup deletion, push, or deployment was performed in this ticket.
