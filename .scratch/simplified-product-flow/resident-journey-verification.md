# Ticket 02 verification

Date: 2026-11-12 (Asia/Manila)

## Delivered behavior

- The resident form starts with category, concern description and nearby landmark. Optional map location and photos use native disclosures; confirmations appear when the required information is present or validation needs them. Emergency guidance, drafts, photo recovery, duplicate suggestions, consent and intake protections remain active.
- My reports includes bounded report history, bounded updates, unread counts, independent continuation controls and direct section links. Preferences use progressive disclosure. The previous notifications route redirects to the dashboard updates section.
- Owners explicitly confirm withdrawal of a Submitted, unpublished report. A transaction verifies ownership and publication state, removes the private report, detaches/tombstones its owned evidence, removes the submission notification, records minimized audit evidence and marks the receipt withdrawn. Photos are immediately inaccessible and become eligible for the existing 24-hour orphan cleanup; physical Storage erasure still uses the configured retention worker.
- Retained withdrawn receipts prevent delayed retries from recreating the report. A recovering tab displays the withdrawn outcome and starts a fresh draft rather than redirecting to a missing report.
- Published reports expose Request removal. The request persists privately, leaves public content unchanged and appears in a bounded operator review queue under Report operations. Request records participate in account erasure and pilot retention. This ticket creates the request/review boundary; it does not silently unpublish a report.
- Notification reconciliation removes withdrawn references even if an older network response arrives afterward.

## Automated evidence

- Focused domain/API/UI tests cover confirmation, owner checks, publication conflicts, concurrent retry, audit failure, evidence tombstones, receipt recovery, notification paging/read state and out-of-order responses.
- Real SDK persistence contracts pass against a unique named database in the isolated `demo-ayos-southville-local` emulator project. The suite removes only its owned synthetic records/user afterward.
- `scripts/verify-intake-browser.mjs` passes photo preparation, interrupted upload recovery, removal, optional MapLibre with controlled tiles, duplicate choice, landmark-only receipt, English/Filipino, keyboard, reduced motion, 200% zoom, overflow and automated axe checks at desktop/tablet/mobile sizes.
- `scripts/verify-report-pages-browser.mjs` passes resident/operator paging, independent update paging, mark-read, offline withdrawal retry and notification removal, English/Filipino, keyboard, reduced motion, overflow and axe checks. Browser adapters are labelled synthetic; actual persistence is checked separately.
- Lint, typecheck and production build pass. Independent Standards and Spec reviews cleared their implementation findings.
- Final full suite: 72 files, 306 tests passed. Isolated real-emulator suite: 5 contracts passed. Visual finish disposition: `ship`.

## Configuration and limits

Deploy the `residentNotifications` composite index declared in `firestore.indexes.json` before using chronological notification pagination against a deployed Firestore database, and confirm it is READY. Emulator success does not prove a deployed index is ready. No live index/application deployment or live deletion was executed for this ticket.

Human screen-reader and physical-device checks remain distinct from automated accessibility. Shared navigation refreshes unread totals on dashboard updates; it does not subscribe to a live remote notification stream.

## Artifacts

Synthetic captures are in `artifacts/`: `intake-{desktop,tablet,mobile}.png`, `intake-mobile-filipino.png`, `report-pages-resident-desktop.png`, `report-pages-resident-mobile-filipino.png`, and their `-viewport.png` captures. Operator captures document retained paging and review behavior.
