# Ayos Southville controlled-pilot operating readiness

Status: ready-for-agent

Approved operating brief: owner-confirmed interview, 2026-10-12 (Asia/Manila). This specification supplements the existing production-completion effort; it does not replace its historical tickets or close its unresolved release gate.

## Problem Statement

Residents need a reporting pilot that someone actually operates, not merely a deployed interface. Existing application workflows have substantial local test coverage, but agreed queue coverage, review expectations, intake pauses, participation consent and truthful pilot evaluation are not yet demonstrated as a complete operating journey. Two intended administrator accounts are not independently verified evidence of working administrator access or dependable backup coverage.

The owner needs a concrete, supportable definition of readiness before inviting residents. A generic service failure, an unattended report or fictional resolution presented as a real outcome would undermine the pilot even if individual modules pass tests.

## Solution

Complete the operating controls and release evidence for an independent, resident-led Southville 1 controlled pilot. Begin with 10 consenting adults only after release approval, run for four weeks and review findings weekly. Expand toward 25 only when coverage and safety remain dependable. Internal pilot desks coordinate external follow-up without promising repairs or claiming official partnerships.

The owner and backup check the queue daily at 7 p.m. Asia/Manila. Report review occurs within two business days, excluding weekends and local holidays. Missed reviews trigger backup takeover and an honest resident delay update. Pause new submissions when neither operator is available or privacy/authorization fails; pause invitations for broken core workflows or missed reviews without coverage. Preserve privacy-safe public browsing during ordinary coverage pauses. Keep test scenarios separate from real reports, public statistics and actual outcome claims.

## User Stories

1. As a resident, I want a clear independent-pilot disclosure, so that I do not mistake this for an official repair service.
2. As a prospective participant, I want to understand the trial before agreeing, so that participation is voluntary.
3. As an adult participant, I want a clear consent choice, so that registration alone is not treated as agreement to a study.
4. As a participant, I want to know which information becomes public, so that I can make an informed reporting decision.
5. As a participant, I want retention and deletion guidance, so that I retain control of my information.
6. As the owner, I want to recruit only consenting residents, so that an invitation is not unsolicited enrollment.
7. As an administrator, I want primary and backup responsibility recorded, so that software access corresponds to operating responsibility.
8. As the backup, I want to see overdue reviews, so that I can take over promptly.
9. As an operator, I want business-day review expectations computed consistently, so that weekends and local holidays do not create misleading deadlines.
10. As an operator, I want a daily queue-check routine, so that new reports are not forgotten.
11. As a resident, I want review distinguished from repair, so that the two-day target does not create a false resolution promise.
12. As a resident, I want an honest delay update, so that an overdue report does not silently remain pending.
13. As an operator, I want takeover recorded without overwriting report history, so that responsibility is accountable.
14. As an administrator, I want to pause intake when coverage is unavailable, so that the pilot does not collect unattended concerns.
15. As a resident, I want to see a pause explanation and expected review resumption when known, so that I know what to do next.
16. As a resident, I want a rejected paused submission to retain my draft, so that I can return without losing work.
17. As a visitor, I want privacy-safe public browsing during a coverage pause, so that existing approved information remains accessible.
18. As an administrator, I want invitation control during a workflow failure, so that recruitment does not outpace the service.
19. As an operator, I want an immediate privacy/authorization stop, so that continued intake does not increase harm.
20. As an operator, I want to record external follow-up, so that forwarding, acknowledgement and actual resolution remain distinct.
21. As a resident, I want public updates reviewed for privacy, so that external contacts and exact locations are not leaked.
22. As the reporter, I want confirmation and dispute after genuine resolution evidence, so that completion reflects my experience.
23. As a tester, I want clearly labelled test scenarios, so that unresolved real concerns are not fabricated into completed repairs.
24. As a visitor, I want statistics based only on real approved reports, so that fictional exercises do not inflate community outcomes.
25. As the owner, I want a four-week trial with weekly reviews, so that continuation is a deliberate decision.
26. As the owner, I want at least 10 participant measurements and an 80% unassisted-submission target, so that usability is assessed beyond successful sign-in.
27. As the owner, I want status comprehension, duplicate discovery and lifecycle completion recorded, so that weaker parts of the workflow are visible.
28. As a participant, I want pseudonymous evaluation records, so that findings do not expose my identity or home.
29. As a reviewer, I want assisted attempts and failures retained in the denominator, so that success is not inflated by excluding inconvenient results.
30. As a reviewer, I want real outcomes distinguished from exercise results, so that the case study remains truthful.
31. As an administrator, I want both administrators to demonstrate access before launch, so that continuity is proven rather than assumed.
32. As an operator, I want monitoring, cleanup and recovery rehearsed safely, so that incidents can be handled without improvisation.
33. As a phone or assistive-technology user, I want accessible English and Filipino controls and system states, so that I can participate independently.
34. As the owner, I want unresolved release gates to prevent launch approval, so that a passing build is not mistaken for a safe operational release.

## Implementation Decisions

- Retain the existing application stack and deepen current access, administration, report lifecycle, notification, privacy and measurement boundaries. Do not rebuild already delivered report processing or invent a parallel role system.
- Extend pilot operating configuration with coverage, intake availability, invitation availability, safe bilingual pause explanations and a known resumption time when applicable. Administrator-controlled changes require server authorization, authoritative confirmation, minimized auditing and concurrency protection.
- Enforce intake pauses at the server-side report and related new-evidence boundaries, including direct requests and in-flight changes. A hidden submit button is not enforcement. Preserve drafts/idempotency keys and distinguish pause refusal from successful submission. Existing report review, resident responses and deletion requests must not be disabled by a routine coverage pause.
- Invitation pauses prevent new recruitment, not ordinary sign-in or access to existing private information. Resume only after coverage is restored or the relevant fault has been fixed and retested; resumption does not automatically approve release.
- Reuse existing operator capabilities. Record primary/backup responsibility and takeover privately; an Administrator role alone does not prove real-world acceptance. Owner affirmation of backup coverage remains a statement until the backup demonstrates participation.
- Use Asia/Manila consistently. Business days are Monday-Friday excluding applicable local holidays. Document and test a deterministic review-deadline convention before implementation; avoid silently guessing holiday dates. Keep calendar inputs inspectable and owner-verified. The daily 7 p.m. check is an operator routine, not a guaranteed automated repair service.
- Surface overdue review work and support a persisted, retry-safe backup takeover and resident delay update through existing lifecycle/notification behavior. Repeated processing must not produce duplicate notifications. Email remains conditional on opt-in and configured delivery; do not add SMS or a new messaging platform.
- Store external follow-up separately from resolution claims. Recording that an organization was contacted must not automatically advance a report to accepted or resolved, establish a formal partnership, or expose private correspondence publicly.
- Capture minimal affirmative, versioned participation consent and adult eligibility acknowledgement before enrollment/report participation. Registration is not consent. Do not introduce identity-document collection or store dates of birth merely to support an adult pilot. Preserve existing retention/deletion requirements for consent-linked records. The owner explains the trial before invitations.
- Keep fictional exercises isolated from real intake, public discovery, insights and real-outcome measurement. Prefer existing isolated demonstration/testing infrastructure. Do not seed fictional resolved reports into production to manufacture successful participant findings.
- Reuse pseudonymous participant codes and outcome fields. Record the evaluation source, enough context to distinguish test exercises from real outcomes, assistance and unsuccessful attempts. Do not collect names, contact details, exact homes or unrestricted private notes in aggregate findings. Deduplicate participants rather than count retries as extra participants.
- The initial trial lasts four weeks after release approval, with weekly human review. Record its start explicitly; do not infer it from deployment or mark the immutable retention-triggering pilot end merely because four weeks elapsed. Expansion beyond the initial 10 requires reviewed coverage and safety, with a cap of 25 for this effort.
- Preserve the Community Field Ledger identity. Use Impeccable for UI slices, established product/design context, appropriate task-first modes and craft-floor before edits. Supply English/Filipino consent, pause, deadline, failure and recovery states; bilingual UI does not automatically translate resident submissions.
- Release readiness must distinguish implemented controls, automated evidence, human checks and external prerequisites. Health failure or a broken private workflow is a launch blocker. Do not mark the existing release ticket resolved while required evidence or actual consented findings are absent.

## Testing Decisions

- Owner-approved primary seam: the complete resident-to-operator-to-resident browser/API journey, with real persisted evidence in an explicitly authorized environment. Focused tests use the existing access, administration, report lifecycle, notification and measurement boundaries for scheduling, pause/consent enforcement and data isolation rather than new overlapping test interfaces. Existing privacy tests remain regression coverage. The owner explicitly approved these test boundaries on 2026-10-12 (Asia/Manila).
- Test externally visible behavior and durable outcomes, not component state, CSS classes, SDK-call counts or private implementation structure. Follow existing boundary tests and browser verification scripts; substitute external providers only in clearly labelled deterministic tests.
- Cover consented approved participation, unverified/unapproved refusal, non-consented participation refusal, unauthorized operating changes, ordinary intake pause, safety pause, invitation pause and authoritative resumption. Direct requests must receive the same protection as browser controls.
- Exercise a saved draft during a pause and an in-flight submission racing a pause. Assert no false receipt, no lost draft, no new orphaned mutation and safe retry after resumption. Verify routine pauses retain existing report processing, resolution response and account-deletion access.
- Use controlled time and calendar inputs for weekends, holidays, Manila date boundaries and the documented two-business-day convention. Assert understandable review expectations, overdue queue visibility, persisted backup takeover and one delay notification despite retries or concurrency.
- Verify that contacting an outside organization does not imply acceptance, resolution or affiliation, and that private correspondence does not enter public projections.
- Assert fictional exercises never appear in real discovery, public insights or actual repair totals. Measure unsuccessful and assisted attempts honestly, deduplicate participants, and verify no identity/location leakage in aggregate records. At least 8 of 10 recorded participants must submit unassisted to meet the 80% target; do not invent stronger success thresholds for the other outcomes.
- Retest existing submission, review, assignment/progression, protected evidence, notification, confirmation and dispute flows alongside operating controls. Notification/email failure must not roll back an already committed lifecycle action.
- Verify phone/tablet/desktop, keyboard focus, screen-reader naming and announcements, zoom, contrast, reduced motion, English/Filipino, slow-network recovery and first-use/loading/empty/validation/pending/success/permission/offline/retry/unexpected-failure states. Use one batched visual inspection, fix findings together and at most one confirmation round. Human screen-reader/device results remain distinct from automated axe checks.
- Preserve existing performance targets: representative 100-report/25-media volume, visible filter/view response within 100 ms, and useful landing/list/detail content within 2.5 seconds at p75 on a representative phone/network. Local aggregation timing alone does not prove deployed mobile performance. Record environment, sampling method, date and artifacts without private payloads.
- Require deployed two-account workflow evidence, proven access for both intended administrators, authorization/private-media checks, monitored failure alert delivery, authenticated cleanup preview and explicitly approved application, isolated managed backup restoration with erasure replay, and safe rollback rehearsal before release approval. Provider changes and destructive rehearsals require explicit target/authority checks; this spec is not blanket permission to run them.
- Record actual consented participant findings only after approval and recruitment. A code-completion ticket may finish before four-week outcome collection, but the release/evaluation record must remain incomplete until its evidence is collected.

## Out of Scope

Unrestricted public rollout or expansion beyond 25 residents; official affiliation without an actual agreement; guaranteed repairs or emergency dispatch; automatic physical resolution; unsolicited invitations; new government/utility integrations; native apps, payments, SMS, public comments and direct messaging; full offline synchronization; replacing the existing stack; fabricated adoption, participant success or community-repair claims.

An intake pause is not permission to expose unsafe public data. During a privacy incident, retain only public browsing demonstrated safe, and restrict affected public surfaces when needed. This does not require an unrestricted public-information shutdown for ordinary operator absence.

## Further Notes

- The owner confirmed the operating brief. The accountable contact and two intended administrator emails are already recorded in the existing conversation; this does not independently prove verified roles, successful access or backup acceptance.
- Four weeks begins after explicit release approval, not immediately after specification publication. No launch date is fabricated here.
- Existing Tickets 01-06 are implementation evidence. Ticket 07 remains the deployed release/evaluation gate, supplemented by these operating controls; it must not be prematurely closed or overwritten.
- The last observed deployed readiness check returned unavailable. Recheck the current environment during implementation rather than assuming earlier missing settings remain missing or have been repaired. Keep secrets out of specs, screenshots, logs and source control.
- Technical details above are proposed implementation guidance synthesized from the confirmed operating behavior, not claims that the controls already exist. Record deterministic calendar conventions and privacy-preserving consent details during implementation; do not invent holidays, official partnership agreements or participant results.
- This spec authorizes no invitations, administrator role changes, production deployment, destructive cleanup, production restore or public launch by itself. Human/operator commitments and release prerequisites remain explicit gates.
