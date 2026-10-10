# 02: Complete real report intake with evidence and location

**What to build:** Complete real report intake with evidence and location as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 01: Launch pilot administration and controlled access

**Status:** ready-for-agent

- [ ] An approved resident completes category selection, description, landmark, duplicate choice, draft recovery, and submission receipt using production data.
- [ ] Compressed photos are stored as actual private Firebase Storage files with randomized paths, bounded count/size/type, ownership checks, and server validation.
- [ ] Upload previews, removal, progress, retry, and interrupted-upload recovery work; report submission accepts only completed owned uploads.
- [ ] MapLibre provides a real location picker using a policy-compliant tile provider with attribution; landmark and coordinate entry remain usable without a map.
- [ ] Exact private coordinates and household details remain operator-only; public coordinates are deliberately approximate.
- [ ] Duplicate suggestions use privacy-safe real reports; idempotent submission recovers ambiguous network outcomes without duplicate reports.
- [ ] Tests cover upload denial, private access, failed storage, interrupted drafts, and accessible non-map submission.

## Impeccable delivery requirements

- Use the Impeccable skill during UI implementation; load project context and the appropriate playbook, and read craft-floor immediately before UI edits.
- Preserve the Community Field Ledger identity in PRODUCT.md and DESIGN.md. Operational screens prioritize task clarity and scanability.
- Provide English and Filipino primary copy, validation, and system states; distinguish public and private information clearly.
- Verify phone, tablet, desktop, keyboard focus, screen-reader announcements, zoom, contrast, and reduced motion.
- Cover first use, loading, empty, validation, pending, success, permission denial, offline, retry, and unexpected failure where applicable.
- Perform one batched desktop/mobile visual inspection, fix findings together, then at most one confirmation round. Record evidence.

## Verification and resolution

Use behavior tests at existing application boundaries and browser tests for the delivered journey. Record relevant production checks without exposing credentials or private records. On completion, append an Answer with evidence and update the map. Human or external prerequisites remain explicit gates.

