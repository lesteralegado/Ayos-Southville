# 04: Make notifications actionable and verify the integrated journey

Status: ready-for-agent

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
