# 03: Operate reports from submission through resolution

**What to build:** Operate reports from submission through resolution as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 02: Complete real report intake with evidence and location

**Status:** resolved

- [x] A role-aware workspace lists reports across actionable statuses, allowing continued processing after acceptance.
- [x] Authorized operators inspect restricted details and evidence, redact public text/area/location, select approved media, accept, reject with reasons, or merge duplicates.
- [x] Submitted and rejected report content remains private; acceptance creates an explicit approved public projection.
- [x] Coordinators and administrators assign valid priority and active internal destination, start work, and publish required English/Filipino updates.
- [x] Resolution requires actual protected uploaded evidence; only valid server-validated transitions are offered and accepted.
- [x] Timeline, notifications, merge relationships, and immutable audit events persist consistently; concurrent or repeated actions do not corrupt state.
- [x] Browser tests exercise the full operator path, forbidden roles, failure recovery, merging, privacy outcomes, and stale-state conflicts.

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

Implemented the bilingual role-aware operator workspace and atomic Firebase lifecycle, with explicit approved public projections, restricted evidence, protected resolution uploads, revision conflicts, canonical merges, notifications, and immutable audit events.

Verification and production prerequisites are recorded in [operator verification](../../../docs/release/operator-verification.md). Typecheck, source lint, production build, application/API/adapter tests, and the full functional browser journey passed. Impeccable hardening preserved the Community Field Ledger identity; one batched visual inspection and one confirmation covered responsive layouts, contrast, keyboard focus, announcements, reduced motion, and text zoom.

Standards review against `bcaa8f3`: one non-blocking duplicated revision check corrected; no remaining findings. Spec review: corrected rejected receipt/history, required-upload copy, and hydration of later supporting evidence; no remaining findings. Production Firebase/Storage/rules verification and human/device checks remain release gates, not completed production claims.

