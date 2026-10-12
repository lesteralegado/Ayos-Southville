# 04: Truthful pilot measurement

**Parent:** ../spec.md

**What to build:** Let administrators record and inspect pseudonymous usability findings and trial reviews without mixing fictional test scenarios into real community outcomes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Provide a complete authorized record/read journey for pseudonymous participant outcomes: submission, assistance, status comprehension, duplicate discovery and lifecycle completion.
- [ ] Distinguish test-scenario exercises from actual community outcomes in persisted records, summaries and displayed findings. Unknown legacy provenance must not silently become a real outcome.
- [ ] Keep fictional reports/evidence isolated from real intake, public discovery, insights and repair totals using existing isolated test/demo infrastructure; do not seed fictional resolutions into production.
- [ ] Deduplicate participants; retries and edited measurements are not extra participants. Preserve assisted/failed attempts in the denominator and never treat uncollected results as success.
- [ ] Measure at least 10 consenting participants during the real trial, targeting at least 80% unassisted submission, while clearly displaying insufficient sample size before that point. Do not fabricate thresholds for other outcomes.
- [ ] Record explicit release approval/start, a four-week trial period, weekly reviews and evidence-backed continuation/expansion decisions. Do not infer the start from deployment or automatically record the irreversible retention-triggering pilot end.
- [ ] Start with 10 participants and permit expansion toward 25 only after reviewed safety and coverage. Recording an approval statement does not independently verify prerequisites or send invitations.
- [ ] Exclude names, email addresses, exact homes and unrestricted private notes from aggregate findings. Preserve existing authorization, retention/deletion and privacy-safe logging.
- [ ] Test no-data and undersized samples, unsuccessful/assisted attempts, duplicate participants, exercise/real/unknown separation, unauthorized edits and public-statistics isolation.

## Delivery and verification

Use the owner-approved resident-to-operator-to-resident browser/API journey as the primary test seam, with focused behavior tests at existing access, administration, report lifecycle, notification and measurement boundaries. Test observable, durable outcomes rather than implementation details. Reuse existing modules; perform only scoped prefactoring needed for this slice, not a standalone wide refactor.

For UI changes use Impeccable, established product/design context and task-first operating screens; read craft-floor immediately before UI edits. Deliver English/Filipino first-use, loading, empty, validation, pending, success, permission, offline, retry and unexpected-failure states where applicable. Verify phone/tablet/desktop, keyboard focus, screen-reader semantics/live announcements, zoom, contrast and reduced motion. Perform one batched visual inspection, fix findings together and at most one confirmation round; record evidence. Automated checks do not substitute for human assistive-technology testing.

Append completion evidence and update this effort's map only after this ticket's criteria pass. Never fabricate participant results or treat code completion as release approval. Preserve the historical production-completion tickets. No invitation sending, role changes, production deployment, destructive cleanup or restore is authorized merely by this ticket.
