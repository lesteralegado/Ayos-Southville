# 02: Consented pilot participation

**Parent:** ../spec.md

**What to build:** Let invited, verified adults make an informed participation choice and receive a private consent receipt before participating in the controlled pilot.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Provide English/Filipino disclosure of the independent trial, lack of guaranteed repair, public/private information boundaries, retention and deletion process.
- [ ] Capture minimal affirmative, versioned consent and adult eligibility acknowledgement. Registration, invitation and email verification alone do not constitute participation consent.
- [ ] Preserve existing verification and invitation/approval checks and additionally refuse non-consented participation at server boundaries, including direct requests and stale/concurrent requests.
- [ ] Declining consent preserves public browsing and available private-account/deletion controls; it does not silently delete the account or submit a report.
- [ ] Provide a private, persisted consent receipt and reliable offline/retry states; avoid duplicate receipts or success claims without server confirmation.
- [ ] Do not collect identity documents or dates of birth for this pilot. Apply existing retention/deletion requirements to identity-linked consent records and exclude them from public projections/logs.
- [ ] Document the owner's pre-invitation explanation and permission procedure; do not assume an in-app checkbox proves that recruitment permission was obtained.
- [ ] Test verified-approved-consented success and unverified, unapproved, non-consented and unauthorized refusals through the existing participation journey.

## Delivery and verification

Use the owner-approved resident-to-operator-to-resident browser/API journey as the primary test seam, with focused behavior tests at existing access, administration, report lifecycle, notification and measurement boundaries. Test observable, durable outcomes rather than implementation details. Reuse existing modules; perform only scoped prefactoring needed for this slice, not a standalone wide refactor.

For UI changes use Impeccable, established product/design context and task-first operating screens; read craft-floor immediately before UI edits. Deliver English/Filipino first-use, loading, empty, validation, pending, success, permission, offline, retry and unexpected-failure states where applicable. Verify phone/tablet/desktop, keyboard focus, screen-reader semantics/live announcements, zoom, contrast and reduced motion. Perform one batched visual inspection, fix findings together and at most one confirmation round; record evidence. Automated checks do not substitute for human assistive-technology testing.

Append completion evidence and update this effort's map only after this ticket's criteria pass. Never fabricate participant results or treat code completion as release approval. Preserve the historical production-completion tickets. No invitation sending, role changes, production deployment, destructive cleanup or restore is authorized merely by this ticket.
