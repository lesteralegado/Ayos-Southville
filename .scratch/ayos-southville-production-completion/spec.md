# Ayos Southville production completion

Status: ready-for-agent

## Problem Statement

Production is deployed, but residents and operators cannot yet complete all intended tasks through the browser. Secure service boundaries exist for many capabilities, while moderation is read-only and administration lacks a usable screen. The homepage uses demonstration records and photo evidence currently records metadata instead of storing files. A passing module test suite does not prove the deployed pilot journey.

## Solution

Complete a controlled, invitation-based Southville 1 pilot for 10-25 verified residents. Connect existing application boundaries to usable browser workflows, real private evidence storage, live discovery, and accountable pilot operations. An approved resident submits a report, an authorized operator processes it, and the original reporter confirms or disputes its resolution.

## User Stories

1. As a visitor, I want clearly disclosed resident-led pilot information and approved live reports, so that I understand the service and its limits.
2. As an administrator, I want invitations and approval controls, so that pilot participation stays controlled.
3. As a verified unapproved resident, I want public browsing and a clear access state, so that I know how to join.
4. As an administrator, I want safe role management and continuity warnings, so that operations retain viable administrators.
5. As an administrator, I want editable categories, destinations, and bilingual emergency guidance, so that intake matches real pilot scope.
6. As a resident, I want reliable category selection, drafts, duplicate suggestions, and receipts, so that I can submit without assistance.
7. As a resident, I want compressed real photo uploads with recovery, so that my evidence survives a weak connection.
8. As a resident, I want private exact location and a landmark alternative, so that operators can locate concerns without publishing my household.
9. As a moderator, I want a working review workspace, so that I can accept, redact, reject, and merge reports safely.
10. As a coordinator, I want assignment and bilingual progress controls, so that responsibility and progress are understandable.
11. As a coordinator, I want protected resolution evidence, so that a resolution claim has support.
12. As a resident, I want notifications and a timeline, so that I understand meaningful changes.
13. As the reporter, I want confirmation and dispute controls, so that completion reflects my experience.
14. As a visitor, I want equivalent live map/list discovery and filters, so that I can find approved concerns accessibly.
15. As a community member, I want privacy-safe accurate insights, so that aggregate outcomes reflect real records.
16. As a resident, I want consent, retention explanations, and deletion requests, so that I control my private information.
17. As an operator, I want abuse protection and reliable mutations, so that concurrent actions and retries do not corrupt reports.
18. As a pilot organizer, I want monitoring, recovery procedures, and verified release evidence, so that I can support residents responsibly.
19. As a phone or assistive-technology user, I want bilingual accessible primary journeys, so that I can participate without help.
20. As a pilot organizer, I want measured real usability findings, so that release claims are grounded in evidence.

## Implementation Decisions

- Retain Next.js, TypeScript, Firebase Auth, and Firestore; reuse existing project-owned application boundaries rather than rebuilding tested domain behavior.
- Firebase Storage holds real private evidence. MapLibre uses a policy-compliant tile provider with attribution. Resend sends opt-in lifecycle email after verified sender-domain setup. Provider details remain replaceable adapters.
- Registration permits public browsing; administrator invitation/approval plus verified email is required for participation. Enforce this on server-side report, evidence, and engagement mutations, not merely hidden UI controls.
- Resident, Moderator, Coordinator, and Administrator capabilities remain distinct. One administrator may initially operate the workflow; launch requires two verified administrators.
- Public discovery starts only after acceptance and explicit public projection. Submitted/rejected content, identity, exact locations, internal notes, and restricted evidence stay private.
- Destinations remain internal pilot desks until formal recipient partnerships exist. Preserve independent resident-led pilot disclosure and emergency diversion.
- Real production data is the default. Demo mode and seeded records are explicitly isolated; unavailable data must never silently become demo content.
- Store timestamps safely and display Asia/Manila time. Bilingual interface copy does not imply automatic translation of resident content.
- Use authoritative confirmation for privileged mutations, concurrency safeguards, idempotency, reliable notification persistence, and independent retryable email delivery.
- Retention: abandoned uploads 24 hours; rejected private media 30 days; pilot records 90 days after an explicit pilot-end date; minimized pseudonymous audits one year. Define deletion exceptions and identity unlinking before implementation.
- Include server-side rate limits, baseline abuse checks, structured privacy-safe errors, uptime monitoring, backup/restore, incident response, and rollback procedures.
- Apply Impeccable to every user-facing slice using existing product/design context, appropriate surface modes, responsive layouts, accessible bilingual states, and bounded visual verification. Load craft-floor before UI edits. Preserve the established Community Field Ledger identity.
- Keep original tickets as historical delivery evidence; use the new seven-ticket dependency map for this completion effort. External provisioning choices, a second administrator, and human verification remain explicit execution prerequisites.

## Testing Decisions

- Primary seam: deployed two-account resident submission, administrator review/assignment/progression, protected evidence, public projection, notifications, and resident confirmation/dispute.
- Prefer existing report, moderation, administration, engagement, and insights boundaries. Assert observable behavior rather than SDK calls, CSS classes, or component internals.
- Add focused browser tests for newly connected journeys and controlled adapters for storage, maps, email, and monitoring in deterministic tests.
- Test direct unauthorized requests, unapproved participation, restricted-file access, public data leaks, concurrency, retries, and notification failure.
- Verify equivalent discovery results and accurate insights with real persisted fixtures; isolate demonstration data.
- Manual keyboard, screen reader, zoom, responsive devices, Filipino copy, and slow-network evidence supplements automation.
- Record deployed evidence and safe restore/rollback checks before release. Real participant findings are recorded only after consented testing.

## Out of Scope

Unrestricted public rollout, expansion beyond Southville 1, official affiliation or guaranteed government action, emergency dispatch, public comments, direct messaging, SMS, payments, native apps, automatic AI moderation, and full offline synchronization.

## Further Notes

The category bootstrap fix was deployed as c9a1eec. The initial verified administrator was assigned separately in production; the second administrator remains a launch prerequisite. Local tests previously reported 61 passing tests with successful typecheck/build; these are a baseline, not completion evidence for the new work. Human checks and real pilot participation remain pending.

See map.md for ticket order. This spec and breakdown were approved in conversation, including Impeccable requirements.

