# 06: Harden privacy, resilience, and pilot operations

**What to build:** Harden privacy, resilience, and pilot operations as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 01, 02, 04, 05

**Status:** resolved

- [x] Invitation checks, server-side rate limits, email verification, idempotency, and baseline automated abuse checks protect sensitive operations.
- [x] Residents receive a clear retention policy and can request account/data deletion through a tracked, administrator-operable workflow.
- [x] Abandoned uploads expire within 24 hours; rejected private media expires after 30 days; pilot records expire 90 days after the recorded pilot end.
- [x] A minimized pseudonymous audit trail expires after one year; deletion removes private identity links and follows documented exceptions.
- [x] Scheduled cleanup is authenticated, repeatable, observable, and tested with dry-run evidence before enabling destructive production cleanup.
- [x] Structured errors, privacy-safe monitoring, and external uptime checks avoid identities, exact locations, descriptions, and media.
- [x] Backup/restore, incident handling, and rollback procedures are executable and documented; restore tests use isolated data.
- [x] Monitoring and retention integrations, environment requirements, and operational ownership are documented and verified.

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

Implemented the verified-account deletion request, administrator review and non-destructive operations workspace, authenticated dry-run/apply retention worker, pseudonymous one-year auditing, stale-request locks, server-side mutation limits and bounded JSON, real supporting-photo uploads, privacy-safe monitoring and independently gated external scheduling. Impeccable shaped the bilingual ledger policy and task-first operations UI; responsive, axe, keyboard, zoom and reduced-motion checks passed in one inspection and one confirmation batch.

Full tests passed 49 files / 158 tests; four subsequent focused regressions bring coverage to 162 tests. Typecheck, ESLint, final production build, isolated browser journey and built-app public/unauthenticated smoke checks passed. Review against user-approved `738aa70` identified Standards 3 / Spec 1; all findings were fixed and both reviewers confirmed resolution. Full-draft recovery was reproduced failing before its fix.

Evidence: `docs/release/hardening-verification.md`. Operator instructions and mandatory release gates: `docs/release/pilot-operations.md`. Production bucket/site/secrets, revised rules, owner and backup acceptance, delivered monitoring notifications, scheduled worker enablement, managed isolated restore rehearsal and reviewed live dry-run remain human/external gates. Destructive cleanup is disabled by default; no production cleanup, cloud restore, push or deployment was performed. Ticket 07 is the next release frontier.

