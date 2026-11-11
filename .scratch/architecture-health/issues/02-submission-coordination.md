# 02: Extract submission and recovery coordination

**Parent:** ../spec.md

**What to build:** Preserve the resident reporting journey through a small explicit submission workflow interface.

**Blocked by:** 01: Automate clean repository verification.

**Status:** ready-for-agent

+- [ ] Use approved submission module and browser/HTTP seams, driving behavior changes test-first.
- [ ] Preserve existing drafts, resident scoping, photos, validation, emergency diversion, duplicate suggestions and availability handling.
- [ ] Represent pending, ambiguous, refused and confirmed outcomes explicitly; retry and receipt recovery retain idempotency identity.
- [ ] Clear relevant local data only after authoritative confirmation or explicit discard.
- [ ] Integrate with existing UI and HTTP contracts; preserve accessible English/Filipino states and verify affected browser journeys.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.
