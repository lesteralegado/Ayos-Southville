# 02: Add private report clarification

Status: resolved

Blocked by: none

Specification: [../spec.md](../spec.md)

## Problem and scope

The agreed workflow lets staff request missing or incorrect information instead of guessing at a resident's concern or map pin. No complete clarification request/response workflow was found in the current report features. Deliver one private vertical slice across domain, persistence, API, resident detail, and operator workspace.

Start with `moderation-module.ts`, `report-module.ts`, the Firebase stores, report APIs, `operator-workspace.tsx`, and authenticated resident report detail. Reuse existing authorization, revision, transaction, notification, and retry patterns.

## Behavior and acceptance criteria

- An operator authorized to review the report can request clarification with a required bounded question. Keep one active request per report; record author, timestamps, revision, and the question privately.
- Show the question prominently to the verified report owner with one Respond action. Other residents and anonymous visitors cannot read or answer it.
- A response contains a required bounded explanation and, when the location needs correcting, an explicitly selected replacement pin. It is a proposed correction, not an automatic overwrite of the original submission or public projection.
- The operator can review the response, accept a substantive correction explicitly, or ask a follow-up after handling the previous request. Preserve original values and a private history of the decision.
- Requesting clarification does not fabricate a new public lifecycle status, promise work, or publish private questions/responses. An existing public report remains unchanged until an authorized reviewed update.
- Pending clarification is prominent in operator detail and resident tracking. After response, operator review is the next required action. Preserve role boundaries; do not grant publication capabilities to a role merely because it can request information.
- Rejection, withdrawal, resolution and archiving invalidate further answers to obsolete requests. Handle stale responses and concurrent decisions explicitly rather than restoring a closed report.
- Persist accepted changes, minimized audit records and applicable notifications consistently with the existing transaction contract. Retry cannot duplicate a question, response, decision or notification; failed requests preserve entered text.
- The ordinary publication path still needs no re-entry: wording/redaction edits stay available, while a substantive concern/location change is routed through clarification and reviewed correction.
- Keep the interaction report-specific; no attachments, chat inbox, or unrestricted messaging expansion is required.

## Verification

Cover legitimate request/response/review, cross-owner denial, operator role denial, invalid/oversized input, stale revisions, duplicate delivery, closed/archived reports, and public projection isolation. Exercise Firebase persistence and transaction failure. Browser-check both languages, keyboard focus, pending/error/retry, and a submitted concern with a corrected pin that remains private until reviewed publication.

## Comments

Preserve original selected coordinates at full precision. Never infer resident agreement from a staff edit or automatically approve submitted photos.

## Answer

Implemented private report clarification across the domain, Firebase transaction boundary, API, owner-only report detail, resident tracking and operator workspace. Staff ask one bounded question; the verified owner replies with an explanation and optional corrected concern, landmark or explicitly selected replacement pin. Operators accept or decline the proposal, preserving the original submission and private decision history. Follow-ups require handling the previous request.

Questions, replies and proposed corrections remain private until authorized reviewed publication. Publication retains the reviewed pin at full precision and individual photo review. Pending questions and unpublished accepted corrections take priority over normal lifecycle actions. Closed or archived reports reject obsolete answers. Revision checks and stable operation references prevent duplicate actions and notifications; failed replies retain entered text. Request notifications reach only the owner without exposing question content in audit records or follower notifications.

### Verification

- All 364 tests across 82 files pass with `npm test -- --maxWorkers=2`. The initial run found a draft-reset regression; fixed it and confirmed focused tests and the full rerun.
- TypeScript and repository lint pass.
- Ten real Firebase emulator persistence tests pass, including private history, deduplication, reviewed pin publication and public isolation. Transaction-failure tests verify rollback.
- English desktop and Filipino mobile browser checks pass: keyboard disclosure, success focus, lost-acknowledgement retry, explicit review, precise corrected pin, original retention, responsive overflow and axe. Existing operator browser regression passes.
- Desktop and mobile screenshots inspected. No design detector ignores added.

### Standards

Independent review against baseline `5697561`: no documented-standard violations. One low-priority duplicated eligibility rule was consolidated into `canClarifyReport`.

### Spec

Independent specification review: zero actionable findings or scope additions. Browser evidence uses synthetic local fixtures; Firebase persistence evidence uses local emulators.