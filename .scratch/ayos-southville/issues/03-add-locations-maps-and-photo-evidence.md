# 03: Add locations, maps, and photo evidence

**What to build:** Enrich reports with private exact locations and protected photo evidence while giving the public equivalent, privacy-safe map and list discovery experiences.

**Blocked by:** 02: Submit and track a community report.

**Status:** resolved

- [x] Residents can place an issue on a map and provide private block, lot, or similarly precise location details.
- [x] Public report reads and map markers reveal only approved approximate locations.
- [x] Residents can select, preview, remove, resize, and compress supported evidence photos before upload.
- [x] File type, count, and size limits are enforced before upload and again at the service boundary.
- [x] Restricted evidence remains unavailable through public asset access.
- [x] Upload progress, failure, retry, and successful attachment states are understandable on unreliable connections.
- [x] Residents can browse the same privacy-filtered dataset using either a map or a complete accessible list.
- [x] Category, status, date, and distance filters are URL-addressable and persist across refreshes.
- [x] Tests prove that exact locations and restricted media cannot be obtained from public contracts.

## Answer

Implemented privacy-separated location and evidence capture, client and service-boundary media validation, responsive map/list discovery, and URL-persistent filters. Public coordinates are reduced to two decimal places and restricted evidence is excluded from public contracts. Verified with the full test suite, typecheck, lint, production build, frontend detector, and two-axis standards/spec review.
