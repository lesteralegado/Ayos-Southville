# 05: Publish live privacy-safe community discovery

**What to build:** Publish live privacy-safe community discovery as a complete browser-to-service-to-data journey for the controlled Southville 1 pilot.

**Parent:** ../spec.md

**Blocked by:** 03: Operate reports from submission through resolution

**Status:** resolved

- [x] Homepage, list, MapLibre map, report detail, and insights use real Firebase records through consistent approved public contracts.
- [x] Only accepted public projections are discoverable; identities, exact locations, internal notes, rejected content, and restricted media never leak.
- [x] Category/status/date/distance filters have shareable URL state; map and accessible list show equivalent results with bounded loading.
- [x] Approved evidence and resolution outcomes render with meaningful alternative text and safe access; duplicate details direct residents to the canonical report.
- [x] Demonstration records are isolated through explicit demo mode; production never silently falls back to invented reports.
- [x] Configured category labels and accurate aggregate definitions are used; recurring-area insights enforce privacy thresholds.
- [x] Tests cover live filtering, empty/failure states, pagination, map/list equivalence, demo isolation, and public privacy contracts.

## Impeccable delivery requirements

- Use the Impeccable skill during UI implementation; load project context and the appropriate playbook, and read craft-floor immediately before UI edits.
- Preserve the Community Field Ledger identity in PRODUCT.md and DESIGN.md. Operational screens prioritize task clarity and scanability.
- Provide English and Filipino primary copy, validation, and system states; distinguish public and private information clearly.
- Verify phone, tablet, desktop, keyboard focus, screen-reader announcements, zoom, contrast, and reduced motion.
- Cover first use, loading, empty, validation, pending, success, permission denial, offline, retry, and unexpected failure where applicable.
- Perform one batched desktop/mobile visual inspection, fix findings together, then at most one confirmation round. Record evidence.

## Verification and resolution

Use behavior tests at existing application boundaries and browser tests for the delivered journey. Record relevant production checks without exposing credentials or private records. On completion, append an Answer with evidence and update the map. Human or external prerequisites remain explicit gates.

## Answer

Implemented approved live discovery through a shared allowlisted Firebase contract, paginated shareable filters, a real lazy-loaded MapLibre map with grouped approximate markers and a complete list alternative, safe approved evidence/detail timelines and canonical redirects, isolated explicit non-production demo mode, configured category labels and thresholded accurate insights. No production fallback fixtures remain. Firestore client reads of raw public documents are denied in the revised local rules; anonymous browsing uses the explicit public API.

Verification: typecheck, source lint, full regression suite, production Next.js build, responsive browser/axe confirmation, keyboard/reduced-motion/200% text checks, functional offline/retry/filter/back/pagination/group-popup checks, and built Next.js worker smoke check. Firebase/Storage/API/tile adapters use deterministic synthetic fixtures; deployed or participant evidence is not claimed. Review against `630bbe3` found no standards breaches and one non-blocking fetch-duplication suggestion; the Filipino engagement spec finding was fixed and re-reviewed with no remaining findings.

See [discovery verification](../../../docs/release/discovery-verification.md) for definitions, test evidence and explicit gates: deployed Firebase/Storage rules and consented persisted records, live tile-provider/CSP checks, physical-device/screen-reader/Filipino comprehension checks, supporting-photo hardening and the remaining Ticket 06/07 launch work. This resolution is local implementation completion, not authorization for public release.

