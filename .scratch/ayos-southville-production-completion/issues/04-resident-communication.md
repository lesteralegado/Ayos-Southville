# 04: Close the lifecycle with resident communication

**What to build:** Close the lifecycle with resident communication as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 03: Operate reports from submission through resolution

**Status:** ready-for-agent

- [ ] Residents see reliable in-app lifecycle notifications, read state, notification preferences, and understandable public timelines.
- [ ] The original reporter confirms resolution or disputes it with a reason; disputes return to review while preserving evidence and history.
- [ ] Resend delivers important opt-in lifecycle emails after sender-domain verification; credentials stay server-side and deployment prerequisites are documented.
- [ ] Email is delivered through a replaceable adapter with retry and duplicate-delivery protection; failure never rolls back report changes.
- [ ] Notification links respect canonical merge references and reveal no private content to unauthorized viewers.
- [ ] Tests cover recipients, preferences, email failure/retry, confirmation, dispute, and non-reporter denial.

## Impeccable delivery requirements

- Use the Impeccable skill during UI implementation; load project context and the appropriate playbook, and read craft-floor immediately before UI edits.
- Preserve the Community Field Ledger identity in PRODUCT.md and DESIGN.md. Operational screens prioritize task clarity and scanability.
- Provide English and Filipino primary copy, validation, and system states; distinguish public and private information clearly.
- Verify phone, tablet, desktop, keyboard focus, screen-reader announcements, zoom, contrast, and reduced motion.
- Cover first use, loading, empty, validation, pending, success, permission denial, offline, retry, and unexpected failure where applicable.
- Perform one batched desktop/mobile visual inspection, fix findings together, then at most one confirmation round. Record evidence.

## Verification and resolution

Use behavior tests at existing application boundaries and browser tests for the delivered journey. Record relevant production checks without exposing credentials or private records. On completion, append an Answer with evidence and update the map. Human or external prerequisites remain explicit gates.

