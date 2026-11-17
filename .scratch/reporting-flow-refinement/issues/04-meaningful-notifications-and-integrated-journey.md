# 04: Make notifications actionable and verify the integrated journey

Status: resolved

Blocked by: 02, 03

Specification: [../spec.md](../spec.md)

## Problem and scope

`notification-center.tsx` currently links every event to `/reports/<reference>` and displays follow/affected confirmations. Verify that each meaningful update reaches a useful authorized detail even when no public projection exists, and reduce new notification noise without erasing history or preferences.

Relevant files: notification center/pages, engagement module, moderation notifications, Firebase stores, optional email delivery and report routes. Integrate clarification events from ticket 02.

## Acceptance criteria

- New resident notifications focus on published, work started, clarification requested, resolved, declined (including a useful duplicate explanation), and archived events.
- Follow/unfollow or preference-save interactions confirm inline instead of creating redundant new feed items. Preserve existing notifications and existing followed-report subscriptions.
- Internal assignment, routine administrative edits, and retries do not create redundant resident alerts. Preserve other necessary existing recipient semantics explicitly rather than deleting them incidentally.
- Each update opens the relevant report and current action. The owner's declined, submitted, clarification-pending or archived report remains reachable through authenticated detail without requiring a public projection. Unauthorized recipients cannot gain private access from a notification URL.
- Clarification, decline and archive notifications remain useful with sign-in redirects, notification pagination, read state, and missing/deleted reports. Provide an explanatory recovery path instead of a dead end; deleted private records must not be resurrected.
- Respect category preferences and optional email opt-in. Keep private details out of email and public responses. Retry and transaction failure do not duplicate notifications or delivery jobs.
- Keep the navbar My reports number equal to the actual owned report total, independent of unread updates; preserve the separate unread update indicator.

## Integrated verification

Run a connected local journey: submit description/photo/pin -> request information -> resident response -> reviewed approval without re-entry -> public exact pin and approved photo -> start work -> resolve -> confirm or dispute -> request archive -> operator archive -> public disappearance and retained private history. Check notification destinations throughout.

Exercise anonymous, owner, another resident, and permitted/denied operator roles; English/Filipino; desktop/mobile; stale changes; interrupted/retried actions; and persistence restart. Verify privacy controls and advanced tools remain reachable. Run appropriate regression, real Firebase emulator, production build and browser checks, documenting results and any untested environments.

## Comments

Existing publication, pin accuracy and archive implementations are regression requirements. Do not rebuild them or deploy to production as part of this ticket.

## Answer

Implemented quieter, actionable notifications. Follow/affected subscription changes confirm inline without adding inbox items; existing subscriptions and historical notices remain. Internal assignment stays in report history/audit but no longer creates resident notifications or email jobs. Publication, work started, clarification, resolution, decline and archive remain meaningful updates. Existing submission receipts, resident confirmation/dispute updates and overdue-review takeover alerts are intentionally retained as acknowledgement, outcome and operating-safety semantics.

Notification links preserve their report destination through verified sign-in before public/canonical routing. Duplicate owners reach their own private decision and related report; canonical followers continue to receive the canonical destination without private reasons. Missing, withdrawn, deleted or inaccessible private targets explain recovery through Updates, My reports and Account/privacy controls. No deleted record is restored. Ordinary public browsing remains available.

Decline notices point to the private reason rather than copying it into notifications. Existing category preferences, optional generic email, atomic outbox, read state, pagination and navbar owned-report/unread separation remain intact. Removed legacy inbox canonical rewriting so persisted destinations match paginated results. Added bilingual inline subscription confirmations and fixed read-timestamp contrast plus mobile recovery-link visibility; no design ignores added.

### Verification

- All 382 regression tests in 86 files pass (`npm test -- --maxWorkers=2`); TypeScript and repository lint pass.
- All 10 real Firebase SDK contracts pass (`npm run test:persistence`) against local Auth/Firestore/Storage emulators with an owned named database, synthetic users/photos and cleanup. Expanded one connected journey: submit photo/description -> clarification request/replay -> resident correction/replay -> explicit review -> restart/recreate module -> prefilled approval with exact pin and approved original photo -> start -> resolve with separate owned resolution evidence -> dispute -> request archive -> concurrent archive retry -> public disappearance and retained private history. Seven distinct notices include the existing submission receipt; six lifecycle email jobs are recorded once. Cross-owner access and denied operator transitions are rejected; private clarification/dispute text stays out of notices and public data. Separate contracts cover confirmation, stale revisions, pagination, total counts, transaction failure and durable receipt recovery.
- Production Turbopack build passes in an isolated HEAD worktree with this ticket's source files. A temporary worktree-only `turbopack.root` points at C:/project so its shared node_modules junction resolves; no production config change or dev build overwrite.
- New notification browser check passes English desktop and Filipino mobile: report destination, keyboard mark-read, inline preference save, preserved inbox, missing-report recovery links, no overflow and axe accessibility checks. Desktop/mobile screenshots visually inspected together; corrected timestamp contrast and a mobile-hidden secondary recovery link, then confirmed.
- Existing clarification and progress browser checks pass bilingual owner/public contexts, reviewed precise-pin publication, lost acknowledgement replay, status/action matrix and archive history. Communication browser check passes persisted read/preferences, confirmation/dispute, private reason, another-resident denial, stale conflict and network recovery. Updated its old exact status assertion to ticket 03's existing dispute label. Consent/privacy browser check passes English/Filipino, responsive/reflow/forced-colors, keyboard and recovery; advanced and privacy controls remain reachable.

### Standards

Independent standards review against baseline `805d094`: no actionable findings.

### Spec

Independent spec review found signed-out notification routing could skip private duplicate decisions or owner resolution actions. Added failing duplicate/public regressions, authenticated notification-origin requests before either branch, and confirmed the fix; reviewer reports no remaining findings.

Verification uses local synthetic browser fixtures and real local Firebase emulators. Production/Vercel, actual email-provider delivery, human screen-reader and field usability testing were not performed. No deployment or production-data changes.
