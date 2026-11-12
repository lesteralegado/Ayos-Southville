# 02 — Simplify the resident journey

Status: resolved

Blocked by: 01

## Outcome

Give residents one short submission flow and one My reports dashboard for reports, unread updates, notification history, and safe report withdrawal/removal requests.

## Scope

- Keep category, description, nearby landmark, optional location, and optional photos in the main report form.
- Reveal emergency guidance, duplicate suggestions, evidence details, and confirmations only when relevant.
- Preserve drafts, photo preparation, validation, consent, intake pauses, idempotency, uncertain-result recovery, authoritative receipts, bounded pagination, and private caching.
- Combine owned reports and notifications; add one unread indicator. Keep optional email preferences under Account or progressive disclosure.
- Add an authorized, auditable withdrawal command for the owner's report while it remains Submitted. Clean up or tombstone owned unpublished evidence according to existing retention/privacy contracts.
- Offer Request removal for published reports. Create the operator-reviewed request boundary without silently deleting public history.
- Preserve English/Filipino copy and loading, empty, validation, permission, conflict, offline, pending, success, and retry states.

## Verification

- Test every progressive form branch plus saved-draft survival through validation, pauses, offline failure, and uncertain submission.
- Test report and notification pagination, unread/mark-read behavior, report-detail navigation, and unavailable-network recovery.
- Add domain/API persistence tests for owner-only withdrawal, invalid status, retries, concurrency, evidence cleanup, notification/audit behavior, and public non-disclosure.
- Verify no private report or notification payload enters public responses or caches.
- Verify keyboard, assistive-technology announcements, and representative phone/desktop layouts.

## Completion criterion

A resident can submit, track, and understand updates in one simple journey; can withdraw only their own private submission; can request review of published removal; all private-data, recovery, and persistence checks pass.

## Implementation evidence

Completed 2026-11-12 (Asia/Manila). See [resident journey verification](../resident-journey-verification.md) for behavior, evidence, artifacts, and deployment prerequisites.

- Final full suite: 72 test files, 306 tests passed.
- Real isolated Firebase emulator: 5 persistence contracts passed.
- Typecheck, lint, production build, intake browser and report-page browser verification passed.
- Standards review: no unresolved findings. Spec review: no unresolved findings.
- Visual finish review: `disposition: ship` after corrected top-of-page capture.

## Comments

The new chronological notification query requires the `residentNotifications` composite index declared in `firestore.indexes.json`. Deploy it and verify READY before enabling the new query in a deployed database. This ticket performed no live deployment or live deletion.

