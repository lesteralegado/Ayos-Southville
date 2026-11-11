# 03: Strengthen persistence transaction verification

**Parent:** ../spec.md

**What to build:** Give maintainers trustworthy persistence evidence for atomic lifecycle changes, revision conflicts and duplicate-safe submission.

**Blocked by:** 01: Automate clean repository verification.

**Status:** ready-for-agent

+- [ ] Verify shared transaction test support before adopting it; failed queued writes leave no partial records.
- [ ] Consolidate report/moderation transaction doubles where appropriate without building another database implementation.
- [ ] Add focused isolated real-emulator checks through existing report/moderation module interfaces for rollback, concurrent revisions and concurrent same-key submission.
- [ ] Assert durable receipt, report, notification and outbox outcomes; preserve access, consent and private/public separation.
- [ ] Provide reproducible synthetic setup and verification evidence without production writes.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.
