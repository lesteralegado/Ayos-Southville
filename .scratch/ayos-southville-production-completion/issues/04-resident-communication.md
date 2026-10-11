# 04: Close the lifecycle with resident communication

**What to build:** Close the lifecycle with resident communication as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 03: Operate reports from submission through resolution

**Status:** resolved

- [x] Residents see reliable in-app lifecycle notifications, read state, notification preferences, and understandable public timelines.
- [x] The original reporter confirms resolution or disputes it with a reason; disputes return to review while preserving evidence and history.
- [x] Resend delivers important opt-in lifecycle emails after sender-domain verification; credentials stay server-side and deployment prerequisites are documented.
- [x] Email is delivered through a replaceable adapter with retry and duplicate-delivery protection; failure never rolls back report changes.
- [x] Notification links respect canonical merge references and reveal no private content to unauthorized viewers.
- [x] Tests cover recipients, preferences, email failure/retry, confirmation, dispute, and non-reporter denial.

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

Implemented the bilingual resident inbox/read state/preferences, original-reporter confirmation and dispute with stale-revision protection, safe public outcomes, canonical notification links, and transactionally persisted opt-in email jobs. A replaceable Resend adapter delivers through an authenticated durable worker with leases, backoff, frozen requests, provider idempotency, and manual-review handling beyond the safe retry window. Report changes do not depend on provider availability.

Typecheck, source/script lint, production build, application/API/Firebase-adapter tests, and the resident browser journey passed. Impeccable hardening preserved the existing Community Field Ledger identity; bounded responsive/accessibility captures corrected a hidden mobile follow control and unclear disabled resolution action. Human and production checks remain explicit gates.

Standards review against `99195d8`: removed an unused resolution-update input; no remaining findings. Spec review: corrected missing canonical-original-reporter merge notifications, with application and persisted email-outbox regressions; no remaining findings.

See [communication verification](../../../docs/release/communication-verification.md) for evidence and deployment steps. Actual sender-domain verification, server credentials, authenticated scheduler activation, delivery/bounce testing, and consented two-account/human verification are not complete merely because the ticket implementation is resolved. No production provider settings or private records were changed, and no real emails were sent during local verification.

