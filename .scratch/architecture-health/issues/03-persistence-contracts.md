# 03: Strengthen persistence transaction verification

**Parent:** ../spec.md

**What to build:** Give maintainers trustworthy persistence evidence for atomic lifecycle changes, revision conflicts and duplicate-safe submission.

**Blocked by:** 01: Automate clean repository verification.

**Status:** resolved

- [x] Verify shared transaction test support before adopting it; failed queued writes leave no partial records.
- [x] Consolidate report/moderation transaction doubles where appropriate without building another database implementation.
- [x] Add focused isolated real-emulator checks through existing report/moderation module interfaces for rollback, concurrent revisions and concurrent same-key submission.
- [x] Assert durable receipt, report, notification and outbox outcomes; preserve access, consent and private/public separation.
- [x] Provide reproducible synthetic setup and verification evidence without production writes.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.

## Answer

The shared external Firebase double now restores all documents and version metadata when a later queued write fails. Report and moderation adapter tests reuse that double with explicit read/failure hooks. Helper contract tests verify rollback, read-before-write refusal and serialized transactions after failure.

The opt-in `npm run test:persistence` command executes real Admin SDK transactions through unchanged report/moderation implementations in an owned named database on the fixed synthetic local emulator project. Three passing contracts cover duplicate-safe concurrent submission, late outbox-create collision rollback followed by successful retry, and concurrent revision conflict with exactly one committed action. Durable report, receipt, notifications, audit, public projection and outbox results are asserted. Unique local Auth users and owned database records are cleaned without modifying the shared default database.

Reproduction and isolation details are in [local persistence contracts](../../../docs/pilot/persistence-contracts.md).

## Comments

2026-11-11: Red baseline demonstrated a partial report update after a later duplicate create failed; the new rollback implementation made it green. Consolidated focused suites passed 24 tests before two more helper cases were added. Full default suite subsequently passed 64 files / 261 tests. TypeScript and scoped lint passed. Real emulator suite passed 3/3 twice after fixture correction; the final run used owned database `contracts-b2deebb3af5c4867ab1ae6ba8dcbef94` on `demo-ayos-southville-local`. No cloud writes, email delivery or deployed/human readiness result is claimed. Integration-level production build remains part of final branch verification.
