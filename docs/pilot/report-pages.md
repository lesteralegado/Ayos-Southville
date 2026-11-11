# Bounded report pages

Resident history and the operator queue load at most 20 matching reports per response. They order immutable submission time descending, then document reference descending to resolve ties. New submissions appear after restarting/reloading the list. Pages are live reads rather than a frozen snapshot; status changes during traversal can change filter membership.

Continuation values contain only version, authenticated actor/filter scope, submission time and reference. The server validates these fields and always applies ownership or operator authorization independently. Continuations are pagination inputs, not authorization tokens. They contain no report descriptions, photos, correspondence or histories.

Ordinary operator status filters query the complete eligible status set before applying the page window. The overdue filter additionally evaluates the current confirmed review calendar and acknowledgement. To keep each request bounded, it inspects at most 100 eligible records and returns a continuation whenever more remain. An empty overdue window therefore says “No matches in this group” and offers “Continue checking older reports”; it does not claim no overdue reports exist. Restart the filter after calendar or status changes to review from the beginning.

Queue responses contain summary fields only. Selected private details load separately by reference; related revision/review metadata is batch-read with a field mask. A canonical merge target can be looked up by its exact reference even if it is on another page. The server still validates the canonical status, authorization and revision when merging.

Residents can load older history with retry after a connection failure. Private report pages and resolution-response eligibility use a direct owned-report getter, so older receipts never depend on membership in the first history page. Both memory and Firebase legacy array-list interfaces are limited to the first 20 entries; all production list journeys use the explicit paginated interfaces. The legacy interfaces must not be used for complete counts or searches.

## Verify locally

```powershell
npm test -- src/features/reports/report-pages.test.ts
npm run test:persistence
npm run verify:report-pages
```

The emulator command requires the [isolated local services](local-emulators.md). The browser command starts its own loopback fixture server and tests actual UI/module behavior using synthetic memory adapters; it is not cloud evidence. It covers next-page selection, overdue continuation beyond an empty window, canonical merge beyond the current page, resident retry, English/Filipino, desktop/mobile overflow, keyboard interaction, reduced motion and automated axe checks. Captures are stored with the architecture-health artifacts. Real human device and assistive-technology verification remains a separate release gate.

## Index deployment remains an external gate

Versioned Firestore indexes cover reporter ownership plus descending submission/reference ordering and operator status plus the same ordering. Both standard and local Firebase configurations reference the index manifest. Local emulator query success checks behavior but does not enforce missing cloud composite indexes. Before an authorized deployment, review/apply the manifest in the intended isolated cloud target and record actual query success there; no hosted index deployment or performance pass is claimed by this work.

Public discovery retains its separate 500-report capacity policy.
