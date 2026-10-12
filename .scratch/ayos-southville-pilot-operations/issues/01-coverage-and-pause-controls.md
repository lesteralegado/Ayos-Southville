# 01: Coverage and pause controls

**Parent:** ../spec.md

**What to build:** Let administrators record primary/backup coverage and pause or resume report intake and invitations, with honest resident-facing explanations and safe server enforcement.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Record coverage using existing authorized operator capabilities; distinguish the owner's statement from demonstrated backup acceptance and access.
- [x] Administrators can independently control new intake and invitations, with authoritative confirmation, current-role checks, minimized audits and concurrency protection.
- [x] Display safe bilingual pause explanations and expected resumption when known, without exposing private schedules or contacts unnecessarily.
- [x] Enforce pauses for direct new-report and intake-evidence requests as well as browser actions; test an in-flight submission racing a pause.
- [x] Preserve drafts and idempotency keys on refusal; never return a false success receipt or allow a stale request to bypass the pause. Safely clean up or retain retryable upload failures under existing retention rules.
- [x] Routine coverage pauses retain privacy-safe public browsing, sign-in, existing report processing, supporting/resolution work, resident responses and deletion requests. Do not reuse pilot-end or account-deletion locks for temporary pauses.
- [x] Privacy/authorization failures support immediate intake suspension and restriction of affected unsafe public surfaces; ordinary absence does not require a public-information shutdown.
- [x] Pause invitations when core workflows fail or missed reviews lack coverage. Resume only after coverage or fault recovery is confirmed; resumption is not release approval.

## Delivery and verification

Use the owner-approved resident-to-operator-to-resident browser/API journey as the primary test seam, with focused behavior tests at existing access, administration, report lifecycle, notification and measurement boundaries. Test observable, durable outcomes rather than implementation details. Reuse existing modules; perform only scoped prefactoring needed for this slice, not a standalone wide refactor.

For UI changes use Impeccable, established product/design context and task-first operating screens; read craft-floor immediately before UI edits. Deliver English/Filipino first-use, loading, empty, validation, pending, success, permission, offline, retry and unexpected-failure states where applicable. Verify phone/tablet/desktop, keyboard focus, screen-reader semantics/live announcements, zoom, contrast and reduced motion. Perform one batched visual inspection, fix findings together and at most one confirmation round; record evidence. Automated checks do not substitute for human assistive-technology testing.

Append completion evidence and update this effort's map only after this ticket's criteria pass. Never fabricate participant results or treat code completion as release approval. Preserve the historical production-completion tickets. No invitation sending, role changes, production deployment, destructive cleanup or restore is authorized merely by this ticket.

## Answer

Implemented and locally verified on 2026-10-12. Evidence: [coverage verification](../../../docs/release/coverage-verification.md). Administrators record private coverage, independent pauses and safe bilingual explanations; report/evidence transactions enforce intake pauses, preserve committed receipts and draft retry keys, and allow existing-report work during routine absence. Revision/current-role checks and privacy-safe before/after audits protect control changes. Immediate safety suspension does not depend on a bulk account lookup for unchanged coverage.

Final suite: 51 files / 177 tests passed; typecheck and production build passed; application lint has zero errors and one pre-existing warning. Synthetic browser and bounded Impeccable verification are documented separately from real-user/provider verification. Required parallel review against owner-approved baseline 60f9f04 found zero remaining Standards findings and zero Spec findings after fixes (implementation commits 63489b8 and a2fdd91).

No push, deployment, invitation, production role mutation, cleanup, restore or release approval was performed. Production health returned 503 during this ticket; real administrator/backup demonstrations and human accessibility/provider/recovery evidence remain Ticket 05 and historical Ticket 07 gates. Ticket 03's dependency on these code controls is satisfied; the parent effort remains open.
