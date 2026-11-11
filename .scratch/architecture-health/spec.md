# Ayos Southville architecture and verification health

Status: ready-for-agent

Date: 2026-11-11 (Asia/Manila).

## Problem Statement

Maintainers need confidence that changes preserve the controlled pilot's reporting journey. The project has substantial automated coverage, but repository workflows do not automatically run its quality checks on pull requests. Existing lint and test warnings obscure new problems.

The resident submission module coordinates drafts, photos, duplicate suggestions, availability and uncertain submission results through many independent state variables. Changes to recovery behavior require understanding presentation and coordination together. Persistence adapters also load growing report collections and related records without consistently bounded reads, while separate transaction doubles provide inconsistent protection against database-contract mistakes.

The owner and future agents need one clear account of current verification status. Historical Java and emulator blockers remain prominent alongside newer passing evidence, making the remaining release work harder to identify.

## Solution

Deliver six bounded improvements in phases. First automate repository checks and improve their signal. Next give resident submission and recovery behavior a small, explicit interface. Then improve persistence verification and bound report-list reads. Finally reconcile readiness documentation with dated evidence while preserving unresolved release gates.

Preserve the independent, resident-led controlled pilot, existing report review and external follow-up semantics, private/public data separation, English and Filipino support, and authoritative server confirmation.

## User Stories

1. As a maintainer, I want pull requests to run automated checks, so that regressions are visible before merging.
2. As a contributor, I want the same check commands locally and in automation, so that failures are reproducible.
3. As a maintainer, I want failed tests to fail verification, so that passing checks mean the suite completed successfully.
4. As a maintainer, I want type and lint errors reported, so that invalid changes cannot appear verified.
5. As a maintainer, I want a production build checked, so that compilation failures are caught before deployment.
6. As a contributor, I want useful failure output, so that I can identify the failing behavior promptly.
7. As a maintainer, I want bundled third-party tooling excluded from application lint, so that unrelated warnings do not hide application defects.
8. As a tester, I want asynchronous assertions to await observable results, so that React warnings do not conceal unfinished behavior.
9. As a tester, I want accessibility checks to disclose their actual coverage, so that unavailable canvas behavior is not mistaken for a successful check.
10. As a resident, I want to resume an interrupted private draft, so that I do not repeat my work.
11. As a resident, I want draft storage failures explained, so that I know whether my work can be recovered.
12. As a resident, I want completed photo attachments retained through recoverable failures, so that retries do not require unnecessary uploads.
13. As a resident, I want duplicate suggestions before submission, so that I can support an existing concern where appropriate.
14. As a resident, I want a clear intake-pause explanation, so that I understand why submission is unavailable.
15. As a resident, I want validation to preserve my draft, so that correcting a field does not erase other information.
16. As a resident, I want submission uncertainty distinguished from confirmed failure, so that I do not accidentally create duplicate reports.
17. As a resident, I want retry and receipt recovery to reuse the submission identity, so that a lost response does not create another report.
18. As a resident, I want success shown only after authoritative confirmation, so that the displayed receipt corresponds to a stored report.
19. As a resident, I want draft cleanup after confirmed success, so that an old submission is not offered again.
20. As a resident, I want accessible English and Filipino recovery states, so that I can complete reporting independently.
21. As a maintainer, I want submission transitions behind a small interface, so that behavior can change without coordinating independent flags throughout presentation.
22. As an operator, I want a bounded report queue with continuation, so that growing history does not require loading every private report.
23. As an operator, I want complete selected-report details, so that queue optimization does not remove necessary report-review information.
24. As a resident, I want navigable report history, so that older reports remain reachable when initial reads are bounded.
25. As a maintainer, I want consistent persistence test contracts, so that tests reject invalid transaction behavior.
26. As a participant, I want failed database transactions to leave no partial lifecycle changes, so that report status and notifications remain consistent.
27. As an operator, I want stale revisions refused, so that concurrent actions do not silently overwrite each other.
28. As a resident, I want concurrent retries to produce one submission, so that unreliable connections do not duplicate my concern.
29. As the owner, I want current local verification distinguished from historical blockers, so that I can identify the remaining work accurately.
30. As a reviewer, I want automated, human and deployed evidence distinguished, so that local success does not imply release approval.
31. As a future agent, I want dated evidence linked from outstanding release work, so that I do not repeat resolved setup diagnosis.

## Implementation Decisions

- Phase 1 covers pull-request verification and warning cleanup. Phase 2 extracts submission coordination. Phase 3 strengthens persistence contracts and bounded listing. Phase 4 reconciles readiness records. Preserve independent deliverability; do not bundle these into one broad refactor.
- Reuse the existing package commands for tests, type checking, lint and production build. Use the committed dependency lockfile and a supported runtime consistent with current project operations. Pull-request checks must run without production credentials, production data writes or deployment. Configure synthetic build inputs only where the existing build actually requires them; never bypass authorization or readiness checks to make verification pass.
- Keep operation scheduling separate from code verification. Add pull-request and default-branch verification with explicit failure propagation. Whether a check is enforced by branch protection is a separate repository setting and must not be claimed without verification.
- Scope lint to maintained application/configuration/verification code and exclude bundled external tooling. Fix application warnings and test timing rather than suppressing warnings globally. Preserve accessibility checks and document capabilities that require a real browser.
- Introduce a submission-coordination module with an explicit state model and a small interface for editing, resuming, discarding, submitting and recovering a receipt. Model mutually exclusive submission phases explicitly and derive presentation flags where possible. Keep independent concerns separate when they can actually coexist.
- Keep draft persistence, photo handling, duplicate suggestions, availability and network operations behind existing adapters or focused internal seams. Introduce dependency injection only where behavior actually varies, such as controlled transport, storage and time. Avoid a general workflow framework.
- Preserve draft compatibility, resident scoping, idempotency keys, emergency diversion, validation, photo ownership, duplicate handling, pause enforcement and server-authoritative receipts. Retain draft and receipt identity after an ambiguous result; clear only the relevant local data after confirmation or explicit discard. Preserve current public/private information policy.
- Reuse existing HTTP contracts during submission extraction. No submission schema migration or new persistence collection is planned for that phase. Read the installed framework guidance before implementation.
- Add bounded operator and resident-history listing through the existing module interfaces, with deterministic ordering and an opaque continuation value validated by the server. Define the page size and cursor shape with implementation evidence; keep these details internal where possible. Preserve access to older records and avoid omissions or duplicates when sort keys tie.
- Load full selected-report details separately where the queue needs only a summary. Batch related document reads where supported. Ensure filtered queue behavior remains correct across the complete eligible result set, rather than filtering only an arbitrary first page. Any required indexes must be versioned and verified in the isolated environment.
- Preserve revision checks, transaction atomicity, notification/outbox writes, privacy allowlists, retention restrictions and authorization when changing persistence reads. Do not move external effects into retryable transactions as part of this effort.
- Reuse the shared Firebase test support where it fits, but verify its own contract before adoption. A simulated transaction must not leave partial changes when a queued write fails. Keep scenario-specific fixtures explicit instead of introducing a second database implementation.
- Add focused real-emulator checks for rollback, concurrent revisions and idempotent submission. Use synthetic isolated projects and test accounts. Keep browser workflow verification distinct from emulator contract tests.
- Keep the public discovery capacity of 500 records unchanged. Its deliberate capacity refusal is separate from unbounded private queue/history loading.
- Establish an obvious current readiness summary linking dated historical evidence. Update stale ticket comments by appending corrections rather than rewriting history. Preserve the distinction between code completion, local automation, human usability, deployed integrations and accountable release approval.

## Testing Decisions

- Owner-approved primary seam: the existing resident-to-operator-to-resident browser/HTTP journey, asserting visible behavior and persisted outcomes. Reuse the existing local-emulator and synthetic browser verification harnesses.
- Owner-approved focused seams: the extracted submission module's public interface for deterministic recovery cases, and existing report/moderation module interfaces backed by real emulators for persistence contracts. These supplement the primary journey where network loss, concurrency or rollback cannot be exercised reliably through a browser alone.
- The owner confirmed these testing seams on 2026-11-11 (Asia/Manila). Do not create parallel overlapping test interfaces or tests for private state variables, markup structure or SDK-call sequences.
- Follow existing report composer, report lifecycle, report-store, moderation-store and connected local-demo tests as prior art. Adapt existing tests where the responsibility moves; avoid preserving duplicate assertions that only mirror implementation.
- Cover fresh submission, draft resume/discard, storage failure, validation refusal, duplicate support, completed photos, intake pause and resumption, lost response, receipt recovery, retry with the same identity and cleanup after confirmation. Test that observable states cannot claim success without an authoritative receipt.
- Preserve emergency diversion, authorization, consent, ownership, private/public projection and English/Filipino regression behavior. Assert keyboard-operable recovery controls, useful error announcements and retained focus behavior where extraction changes interaction.
- Verify bounded reads through observable page results: complete traversal, stable ties, empty/final pages, invalid continuation, selected details, correct filters and refusal of unauthorized access. Use representative 100-report/25-media fixtures where relevant. Do not equate local timings with deployed mobile performance.
- Verify real transaction rollback, two conflicting revisions and concurrent same-key submissions against isolated emulators. Assert durable report, receipt, notification and outbox outcomes rather than internal operation counts.
- Verify that pull-request automation executes required commands, propagates failure and requires no production secrets. Do not deliberately break a shared branch or mutate branch protection to prove it.
- Run relevant focused tests during each phase, then the existing suite, type checks, lint and build before completion. Rerun affected browser journeys for submission/listing changes. Distinguish jsdom accessibility checks from real-browser and human assistive-technology evidence.
- Confirm readiness links resolve, historical failures are dated and the unresolved deployed/human release gates remain explicit. No new human or provider result may be inferred from an automated pass.

## Out of Scope

Stack replacement, a general workflow engine, visual redesign, expanded report categories or geography, new communication channels, full offline synchronization, discovery expansion beyond its existing capacity, production data migrations without a demonstrated requirement, production deployment, branch-protection changes, invitations, real participant observations, external account/role changes, destructive cleanup and managed restore.

This effort does not establish official affiliation, guarantee repairs, satisfy human testing by simulation or approve the controlled pilot for recruitment.

## Further Notes

- The survey baseline on 2026-11-11 passed 63 test files and 258 tests. Type checking passed. Lint completed with zero errors and 94 warnings in bundled skill scripts. React act and jsdom canvas warnings were also observed.
- The test run reported approximately 67 seconds overall, with environment creation accounting for most tracked time. Test-environment tuning is a later optimization requiring isolation evidence, not an acceptance requirement for this effort.
- Existing staged design assets, skill files, product documentation and other user changes must be preserved.
- The sandbox execution helper failed before process startup; approved execution outside the sandbox enabled the survey. That is an environment limitation, not a diagnosed application defect.
- The specification synthesizes all six recommendations; the proposed implementation order prioritizes quality checks and warning signal before submission extraction. Implementation tickets have not yet been created.
- Relevant evidence: [survey-era local demonstration verification](../../docs/release/demo-verification.md), [current local emulator instructions](../../docs/pilot/local-emulators.md), and [historical operational release evidence](../../docs/release/operational-readiness-verification.md). Recheck current conditions during implementation.
