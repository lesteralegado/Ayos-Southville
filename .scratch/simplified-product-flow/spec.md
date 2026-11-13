# Simplified Ayos Southville product flow

Status: ready-for-agent

Date: 2026-11-12 (Asia/Manila)

## Problem

Ayos Southville exposes the reporting product, controlled-pilot operations, evaluation tools, privacy operations, and release evidence with similar visual weight. Residents and operators must navigate details that are important to the system but uncommon in the normal reporting journey. Operators also re-enter public information already supplied by residents and face many actions at once.

The product needs one obvious journey: browse reports, submit a concern, review and publish it, record progress, report resolution, and let the resident confirm or dispute the outcome. Simplification must preserve privacy review, account deletion, auditability, authorization, idempotency, emergency guidance, retention, and truthful independent-pilot language.

## Outcome

Make community reporting the primary product. Use one main action per screen, progressive disclosure, role-aware navigation, automatic public drafts, and three primary operator actions. Move exceptional actions and controlled-pilot tools behind contextual or advanced surfaces. Preserve server-side safety behavior even when its controls are not part of the everyday interface.

## Core journey

1. A visitor browses privacy-safe community reports.
2. A verified, approved, consenting resident submits one short report containing category, description, nearby landmark, optional location, and optional photos.
3. The system prepares a private public-report draft from the submission.
4. An operator compares the original submission with the editable public draft, optionally approves individual photos, then selects **Approve and publish**.
5. That operator becomes the report owner. The report becomes public and under review; timeline, audit, and notifications update atomically.
6. The owner selects **Start work** when action begins.
7. The owner selects **Mark resolved** with the required outcome information.
8. The resident receives **Confirmed fixed** and **Still a problem** choices. Confirmation closes the report; a continued concern returns it to review with the explanation preserved.

## Product surfaces

### Primary navigation

- Community reports
- Report a concern
- My reports
- Report operations, visible only to authorized operators
- Account

Notifications appear within My reports with one unread indicator. Authorized administration is reached from Account. `/pilot`, `/insights`, and `/administration/measurement` remain available under Advanced pilot tools rather than primary navigation.

### Resident experience

- Use one short report form. Reveal emergency guidance, duplicate suggestions, evidence details, and confirmations only when relevant.
- Keep category, description, nearby landmark, optional map location, and optional photos.
- Preserve drafts, idempotent retry, submission recovery, server-side authorization, consent, and intake-pause enforcement.
- Combine owned reports and notifications into one resident dashboard. Email delivery is an optional Account preference.
- Allow the resident to withdraw an unpublished submitted report. Withdrawal removes the private report through an authorized, auditable server operation and cleans up owned evidence safely.
- For published reports, offer Request removal rather than immediate deletion. The request must enter an operator-reviewed privacy-safe process and must not silently erase accountable public history.
- Present registration as create account, verify email, accept the short participation disclosure, then report when invited or approved. Preserve the underlying invitation, approval, consent, and deletion records.

### Operator experience

- Group work into New, Active, Waiting for resident, and Closed. Show the operator's owned reports first.
- Use three primary actions: Approve and publish, Start work, and Mark resolved.
- Put reject, duplicate, reassign, external follow-up, backup takeover, and detailed history under More actions or contextual advanced sections.
- Approve and publish shows the original private submission beside the public draft. The draft deterministically starts from the resident description and nearby landmark. It must be editable and visibly warn that names, contact details, exact homes, plates, faces, and private documents require removal.
- Submitted photos remain private unless the operator selects each public photo explicitly.
- Approve and publish assigns ownership to the acting operator. Reassignment remains available under More actions.
- Reject requires a reason. Duplicate requires a reason and canonical report reference. Both notify the resident automatically.
- A failed action preserves entered text, commits no partial state, explains the failure, and offers one Retry action.

### Public lifecycle

- Submitted: private and awaiting review.
- Under review: approved and public.
- In progress: work has started.
- Resolved: operator reports completion and awaits the resident.
- Confirmed fixed: resident confirms the outcome.
- Still a problem: resident disputes resolution and returns the report to review.

Existing Assigned records remain intact and display as In progress in simplified resident/public presentation. Historical timelines remain truthful. Internal ownership is not a separate public stage.

### Administration

The normal administration surface contains People and access, Invitations, and Report categories. Operating pauses, review calendar, audit history, retention, privacy cleanup, pilot configuration, measurement, and release evidence move under Advanced settings or Advanced pilot tools.

The UI may consolidate controls, but authorization remains enforced by the existing Moderator, Coordinator, and Administrator capabilities. Users see only actions their capabilities allow.

### Public engagement

Replace separate Follow and This affects me controls with one understandable Get updates interaction. Retain distinct internal data only if a demonstrated product decision still consumes it; otherwise stop presenting impact counting as an everyday function.

## Automation rules

Each accepted lifecycle action commits the report state, public projection, timeline, audit record, resident notification, and applicable email job atomically or not at all. The interface must never require separate saves for those side effects.

System labels and automatic notifications remain English/Filipino. Operator-authored public updates require one message; a translation is optional. The UI identifies the language and displays a supplied translation without pretending untranslated text was translated.

## Safety boundaries

- Preserve the independent, resident-led controlled-pilot disclosure.
- Preserve private/public data separation and explicit public-photo approval.
- Preserve emergency redirection; this is not dispatch.
- Preserve authorization, revision conflicts, rate protection, transaction atomicity, audit minimization, retention, erasure ledgers, account deletion, and safe restore behavior.
- Preserve configurable intake/invitation pauses and truthful external-follow-up semantics.
- Preserve access to existing report processing, resident responses, and deletion during ordinary pauses.
- Advanced functionality may be hidden from the normal path; implementation must prove it remains reachable by authorized users.

## Acceptance criteria

- A resident can submit a valid report through one short, mobile-friendly form without navigating unrelated pilot operations.
- An operator never has to re-enter information already supplied by the resident; they review or edit a prepared draft.
- A normal report requires only Approve and publish, Start work, and Mark resolved from the operator.
- Every primary action updates all relevant views and records atomically.
- Private information and photos never become public without operator review.
- Residents see reports and updates in one dashboard and can respond to reported resolution.
- Residents can withdraw private submitted reports and request review of public removal.
- Primary navigation contains only the five agreed destinations and is role-aware.
- Pilot/evaluation/retention controls are absent from everyday navigation but remain accessible to authorized users.
- Existing Assigned records render as In progress without destructive migration.
- English and Filipino, keyboard access, focus behavior, announcements, reduced motion, phone layouts, loading, empty, validation, offline, permission, conflict, pending, success, and retry states remain supported.
- Existing privacy, persistence, lifecycle, and release-safety tests remain green; new behavior has tests at real domain/API/UI seams.

## Delivery strategy

Implement four vertical slices in order: product shell, resident journey, operator journey, then lifecycle closure and integrated verification. Each ticket drives tests red-green, reads the installed Next.js 16.4.5 documentation before changing framework code, and finishes with its stated verification. Complete a standards/spec code review over the integrated diff before release.

## Out of scope

- Automatic AI moderation, rewriting, translation, classification, or publication
- Automatic public release without a human privacy decision
- Removing server-side privacy, audit, authorization, retention, or operational safeguards
- Replacing Firebase, Next.js, or the existing domain modules wholesale
- Official government affiliation, emergency dispatch, guaranteed repairs, public comments, direct messaging, SMS, payments, or native mobile applications
- Destructive migration of historical report statuses or timelines
- Production deployment, participant invitations, destructive cleanup, or public launch authorization

