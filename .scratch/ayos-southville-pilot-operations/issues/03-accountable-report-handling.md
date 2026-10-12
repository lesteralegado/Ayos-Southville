# 03: Accountable report handling

**Parent:** ../spec.md

**What to build:** Let internal pilot desks review reports on a clear business-day schedule, hand overdue work to the backup, inform residents about delays and record external follow-up without inventing repair claims.

**Blocked by:** 01: Coverage and pause controls.

**Status:** ready-for-agent

- [ ] Use the recorded primary/backup coverage and the agreed daily 7 p.m. Asia/Manila queue-check routine. Do not imply that a scheduler performs a human review.
- [ ] Document a deterministic two-business-day deadline convention and verify applicable holiday inputs with the owner before using them. Business days exclude weekends and local holidays; review means acknowledgement and next step, not repair.
- [ ] Expose understandable review expectations to residents and actionable due/overdue work to authorized operators; record actual acknowledgement and next-step decisions.
- [ ] Permit persisted backup takeover and an honest resident delay update without overwriting history. Respect current capabilities, preserve concurrency checks and prevent duplicate notifications during retries.
- [ ] Missed reviews without available backup coverage can lead to the invitation pause from Ticket 01; no software role assignment is treated as proof that a person accepted responsibility.
- [ ] Record external follow-up and the outside organization's response privately; distinguish forwarded, acknowledged/accepted and resolved. Contact alone does not advance acceptance/resolution or imply an official partnership.
- [ ] Publish only explicitly reviewed, privacy-safe bilingual updates. Do not leak private correspondence, contacts or exact locations through notifications, public projections or logs.
- [ ] Preserve genuine evidence-backed resolution, reporter confirmation/dispute and independent opt-in email delivery. A notification/provider failure must not roll back committed report changes.
- [ ] Test controlled time across weekends, holidays and Manila date boundaries, overdue takeover, concurrent actions, retries, one durable delay notification and external-contact privacy.

## Delivery and verification

Use the owner-approved resident-to-operator-to-resident browser/API journey as the primary test seam, with focused behavior tests at existing access, administration, report lifecycle, notification and measurement boundaries. Test observable, durable outcomes rather than implementation details. Reuse existing modules; perform only scoped prefactoring needed for this slice, not a standalone wide refactor.

For UI changes use Impeccable, established product/design context and task-first operating screens; read craft-floor immediately before UI edits. Deliver English/Filipino first-use, loading, empty, validation, pending, success, permission, offline, retry and unexpected-failure states where applicable. Verify phone/tablet/desktop, keyboard focus, screen-reader semantics/live announcements, zoom, contrast and reduced motion. Perform one batched visual inspection, fix findings together and at most one confirmation round; record evidence. Automated checks do not substitute for human assistive-technology testing.

Append completion evidence and update this effort's map only after this ticket's criteria pass. Never fabricate participant results or treat code completion as release approval. Preserve the historical production-completion tickets. No invitation sending, role changes, production deployment, destructive cleanup or restore is authorized merely by this ticket.
