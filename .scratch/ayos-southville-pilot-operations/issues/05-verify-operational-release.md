# 05: Verify operational release readiness

**Parent:** ../spec.md

**What to build:** Produce current deployed evidence that the operating controls and existing report journey are safe and usable, with a human go/no-go decision before any resident recruitment.

**Blocked by:** 01: Coverage and pause controls; 02: Consented pilot participation; 03: Accountable report handling; 04: Truthful pilot measurement.

**Status:** claimed

**Execution:** Agent-assisted verification with mandatory human and external-service gates. No deployment or destructive operation is implicitly authorized.

- [ ] Verify the intended deployment/project, environment and commit. Readiness passes; required server settings, private Storage, reviewed rules and provider integrations are configured without exposing secrets.
- [ ] Both intended administrators demonstrate verified-account access and operational responsibility/backup acceptance. A supplied email, role field or owner's assertion is not sufficient evidence.
- [ ] Exercise the deployed resident-to-operator-to-resident flow with authorized accounts and real stored evidence: consent/access, submission, review, assignment/progression, private/public projection, notifications, genuine resolution evidence and confirmation/dispute. Use isolated test scenarios, not fabricated real outcomes.
- [ ] Verify direct unauthorized/unapproved/non-consented requests, restricted-file protection, pauses, overdue takeover, notification persistence and no identity/location/contact leakage.
- [ ] Record human phone/tablet/desktop, keyboard, screen-reader, 200%/400% zoom where relevant, contrast/forced-colors, reduced-motion, English/Filipino and slow-network results with date, environment, tester and findings. Distinguish these from automated browser/axe results.
- [ ] Verify representative 100-report/25-media performance, <=100 ms filter/view response and <=2.5 s useful-content p75 on the stated representative phone/network. Record sampling and waterfall evidence; local aggregate timing alone is insufficient.
- [ ] Verify monitored failure alert delivery to owner/backup, authenticated cleanup dry-run and separately approved application, isolated managed restore with erasure replay and safe rollback rehearsal. Resolve targets and obtain authority before destructive/provider changes; no real identity revival.
- [ ] Fix discovered launch blockers within scope and rerun failed checks. If scope or new authority is required, record the blocker rather than bypassing it.
- [ ] Maintain dated evidence distinguishing automated, human and external prerequisites. Record explicit accountable release approval only after all required checks pass; missing evidence keeps this ticket unresolved and recruitment paused.
- [ ] Share evidence with the existing production-completion release gate without overwriting or prematurely closing it. Actual consented findings belong to the subsequent pilot, not this prelaunch verification.

## Delivery and verification

Use the owner-approved resident-to-operator-to-resident browser/API journey as the primary test seam, with focused behavior tests at existing access, administration, report lifecycle, notification and measurement boundaries. Test observable, durable outcomes rather than implementation details. Reuse existing modules; perform only scoped prefactoring needed for this slice, not a standalone wide refactor.

For UI changes use Impeccable, established product/design context and task-first operating screens; read craft-floor immediately before UI edits. Deliver English/Filipino first-use, loading, empty, validation, pending, success, permission, offline, retry and unexpected-failure states where applicable. Verify phone/tablet/desktop, keyboard focus, screen-reader semantics/live announcements, zoom, contrast and reduced motion. Perform one batched visual inspection, fix findings together and at most one confirmation round; record evidence. Automated checks do not substitute for human assistive-technology testing.

Append completion evidence and update this effort's map only after this ticket's criteria pass. Never fabricate participant results or treat code completion as release approval. Preserve the historical production-completion tickets. No invitation sending, role changes, production deployment, destructive cleanup or restore is authorized merely by this ticket.

## Comments

2026-10-12: Started read-only deployed verification. [Initial current evidence](../../../docs/release/operational-readiness-verification.md) records NO-GO: production health 503, pilot-status 404, GitHub main 60f9f04 versus local 9a25f19 (12 unpublished commits), and unverified deployed source SHA. Scoped CLI inspection succeeded after the connector's permission failure. All acceptance criteria remain unchecked. Await explicit push/deployment authority, confirmed staging isolation and authorized test accounts/data operations; human and external-service gates remain mandatory. No final release approval, external writes or completion claim.

2026-10-13: Owner subsequently authorized push; GitHub main verified at 9a25f19. Owner declined billing and approved an isolated local-emulator setup while preserving photo evidence. Connection/startup test boundaries approved. [Local instructions](../../../docs/pilot/local-emulators.md) use a synthetic demo project, not staging/production; Java 21 is currently missing, so live local journey verification remains pending. Deployed release, human checks and external-service gates are not satisfied. Ticket stays claimed/unresolved; no release approval or recruitment authorization recorded.
