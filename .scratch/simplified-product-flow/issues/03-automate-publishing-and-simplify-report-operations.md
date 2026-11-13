# 03 — Automate publishing and simplify report operations

Status: resolved

Blocked by: 02

## Outcome

Prepare public drafts automatically and let an authorized operator manage normal reports through Approve and publish, Start work, and Mark resolved.

## Scope

- Define a deterministic public-draft function using the submitted description and nearby landmark.
- Present the original private submission beside an editable public draft with concise privacy warnings.
- Require explicit selection for every public photo.
- Make Approve and publish assign the acting operator as owner and atomically update private state, public projection, timeline, audit, notification, and delivery job.
- Organize work into New, Active, Waiting for resident, and Closed; show owned work first while preserving bounded pagination.
- Make the three normal lifecycle actions primary. Move reject, duplicate, reassign, external follow-up, backup takeover, and detailed history under More actions or contextual advanced sections.
- Require a reason for rejection and a reason plus canonical reference for duplicate handling.
- Preserve capabilities, revision conflicts, retry safety, public-projection validation, and entered form values after failures.

## Verification

- Drive red-green tests at the moderation-domain/API seams before changing implementation.
- Cover draft creation/editing, private-data exclusion, no-photo default, selected-photo publication, ownership, stale revisions, duplicate retries, unauthorized actors, and atomic failures.
- Test grouping and action visibility for Moderator, Coordinator, and Administrator capabilities.
- Test the normal three-action lifecycle and every exceptional action's continued reachability.
- Verify the public page, resident view, timeline, audit, notification, and delivery outcomes agree after each committed action.
- Verify keyboard, screen-reader naming, zoom, reduced motion, phone/desktop layouts, and all failure/retry states.

## Completion criterion

An authorized operator never retypes resident information, advances a normal report with only three primary actions, publishes no unreviewed field or photo, retains every authorized exceptional operation, and passes all domain/API/UI checks.

## Answer

Completed 2026-11-13 (Asia/Manila). Public drafts use the resident description, landmark, and rounded coordinates, with the original private submission alongside an editable preview. Photos remain private unless explicitly approved. Approval atomically publishes and assigns ownership; authorized operators can start work directly and resolve with confirmed evidence. Four groups and bounded owned-first pagination replace the primary status controls; exceptional actions remain under More actions.

Retry preserves edited summary, selected photos, and alternative text across revision refreshes. Existing roles, revision checks, and atomic persistence remain enforced. Reassignment verifies an eligible operator in the persistence transaction.

- Full suite: 74 files, 317 tests passed; focused recovery test passed after correcting test typing.
- Typecheck, lint, production build and whitespace checks passed.
- Real isolated Firebase emulator: 6 persistence contracts passed during implementation.
- Operator browser: normal lifecycle, protected upload, reject/duplicate, forbidden role, privacy, stale revisions and connection recovery passed. Desktop/tablet/mobile, English/Filipino, keyboard, axe checks, reduced motion and 200% text zoom passed. Shared-shell report-page browser passed.
- Independent Standards and Spec reviews cleared all findings.
- Visual finish review: `disposition: ship`. Existing legacy accent-border findings were left unchanged; no suppressions were added.
- Captures: `../artifacts/operator-desktop.png`, `operator-tablet.png`, `operator-mobile.png`, `operator-mobile-filipino.png`, and `operator-zoom200.png`.

## Deployment prerequisite

Deploy the new `moderationReports` ownership composite indexes declared in `firestore.indexes.json` and confirm READY before enabling the queue against a deployed database. No live deployment was performed. Automated accessibility checks do not substitute for human screen-reader/device validation.
