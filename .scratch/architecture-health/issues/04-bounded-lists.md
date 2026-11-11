# 04: Bound operator queues and resident history

**Parent:** ../spec.md

**What to build:** Let operators and residents navigate growing report histories through bounded pages without losing older reports or complete details.

**Blocked by:** 03: Strengthen persistence transaction verification.

**Status:** ready-for-agent

+- [ ] Implement deterministic validated continuation through existing module, HTTP and UI interfaces; version necessary indexes.
- [ ] Preserve full-set operator filter correctness, stable ties, older-record access and complete selected-report details.
- [ ] Batch related reads and avoid hydrating full report sets for queue summaries.
- [ ] Preserve authorization, privacy projections, retention restrictions, revisions and existing notification behavior.
- [ ] Test complete traversal, empty/final pages, bad cursors and unauthorized requests; exercise representative 100-report/25-media fixtures and affected bilingual browser journeys.
- [ ] Keep public discovery capacity unchanged; do not claim local timing proves deployed phone performance.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.
