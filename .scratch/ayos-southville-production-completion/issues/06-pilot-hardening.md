# 06: Harden privacy, resilience, and pilot operations

**What to build:** Harden privacy, resilience, and pilot operations as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 01, 02, 04, 05

**Status:** ready-for-agent

- [ ] Invitation checks, server-side rate limits, email verification, idempotency, and baseline automated abuse checks protect sensitive operations.
- [ ] Residents receive a clear retention policy and can request account/data deletion through a tracked, administrator-operable workflow.
- [ ] Abandoned uploads expire within 24 hours; rejected private media expires after 30 days; pilot records expire 90 days after the recorded pilot end.
- [ ] A minimized pseudonymous audit trail expires after one year; deletion removes private identity links and follows documented exceptions.
- [ ] Scheduled cleanup is authenticated, repeatable, observable, and tested with dry-run evidence before enabling destructive production cleanup.
- [ ] Structured errors, privacy-safe monitoring, and external uptime checks avoid identities, exact locations, descriptions, and media.
- [ ] Backup/restore, incident handling, and rollback procedures are executable and documented; restore tests use isolated data.
- [ ] Monitoring and retention integrations, environment requirements, and operational ownership are documented and verified.

## Impeccable delivery requirements

- Use the Impeccable skill during UI implementation; load project context and the appropriate playbook, and read craft-floor immediately before UI edits.
- Preserve the Community Field Ledger identity in PRODUCT.md and DESIGN.md. Operational screens prioritize task clarity and scanability.
- Provide English and Filipino primary copy, validation, and system states; distinguish public and private information clearly.
- Verify phone, tablet, desktop, keyboard focus, screen-reader announcements, zoom, contrast, and reduced motion.
- Cover first use, loading, empty, validation, pending, success, permission denial, offline, retry, and unexpected failure where applicable.
- Perform one batched desktop/mobile visual inspection, fix findings together, then at most one confirmation round. Record evidence.

## Verification and resolution

Use behavior tests at existing application boundaries and browser tests for the delivered journey. Record relevant production checks without exposing credentials or private records. On completion, append an Answer with evidence and update the map. Human or external prerequisites remain explicit gates.

