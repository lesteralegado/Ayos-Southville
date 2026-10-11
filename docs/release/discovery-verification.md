# Ticket 05: live discovery verification

## Story and boundaries

An anonymous visitor opens the homepage, filters approved reports through `/api/public-reports`, switches the same bounded result page between MapLibre and its complete accessible list, opens approved evidence and a public timeline, and reads aggregates through `/api/insights`.

- Firebase Admin reads only explicit approved projections; a shared runtime allowlist strips all unapproved fields, nested extras, private identities and exact locations. Approximate coordinates are rounded to two decimals. Only five accepted public statuses are eligible.
- Detail and public-photo authorization use that same projection. Photos are served through the existing no-store authorization boundary, never public Storage URLs. Resolution photos remain restricted unless independently approved; public resolution timeline updates are shown.
- Duplicate references resolve through a bounded, cycle-safe lookup only to a currently approved live canonical report; no private source or canonical payload is returned.
- Filters persist in shareable URL parameters and support reload and back navigation. Dates mean the preceding rolling 7/30 days from the server clock. Distance is approximate kilometres from latitude 14.281, longitude 121.127, not geolocation or a resident address. Reports lacking a reviewed point remain listed but cannot match a distance filter.
- Pages contain at most 20 reports. The controlled pilot scans at most 501 approved documents and refuses complete results/aggregates above 500 rather than silently reporting partial totals. Raise this capacity only with a reviewed indexed/paginated aggregation design before a larger rollout.
- Insights include all currently approved projections, not homepage filters/page. Median durations use valid, nonnegative submission-to-first-public-review / first-operator-claimed-resolution intervals. Resolution is not confirmation and can precede a reopening. Confirmation counts current status. Recurring areas require at least three approved reports, not necessarily three distinct residents.

## Local evidence

Behavior tests exercise public report/service and API boundaries with deterministic external Firebase/Storage adapters. The browser harness uses the actual UI, discovery/insights boundaries and real MapLibre WebGL renderer with synthetic external records and deterministic raster tiles. These are not production Firebase or consented participant evidence.

Commands: `npm run typecheck`, `npx eslint src scripts --quiet`, `npm test -- --maxWorkers=2`, `npm run build`, `npm run verify:discovery` (captures), `npm run verify:discovery -- --functional-only` (no visual inspection), and `node scripts/verify-discovery-production.mjs` (built Next.js worker smoke check, synthetic API/tile interception).

The first responsive inspection found inherited mobile hiding of quiet controls, low-contrast report metadata and overlapping approximate markers. These were corrected together. MapLibre v6 needs explicit worker configuration; the installed package and [official bundler guide](https://maplibre.org/maplibre-gl-js/docs/#installation) guided the Next.js worker asset setup. Responsive captures under `.scratch/ayos-southville-production-completion/artifacts/discovery-*.png` are local, ignored artifacts. One final confirmation batch covers desktop 1440×1000, tablet 768×1024 and phone 390×844, EN/FIL, axe WCAG AA checks, keyboard focus, 200% text scaling and reduced-motion preference.

Final confirmation passed all responsive axe checks; the targeted Impeccable detector returned `[]`. Insights now use a bounded operational content wrapper rather than the inherited full-width marketing headline. The review-requested Filipino engagement correction is separately covered by a focused UI test and functional-only pending/offline rollback assertions; captures predate that localized control correction. Grouped-marker popups and their keyboard focus pass the functional browser check. The real Next.js production smoke check confirms hydration and successful hashed worker-asset responses after tile decoding; its fixture tiles are valid generated PNGs, not live OSM imagery.

Two-axis review used the user-approved Ticket 04 baseline `630bbe3`. Standards: zero documented-rule breaches; one accepted low-priority duplication suggestion for the two public-data fetch routines. Spec: the Filipino engagement copy gap was corrected and re-reviewed with zero remaining findings. Supporting-photo persistence remains a separate hardening gate, not a demonstrated success of this ticket.

## Demo isolation

Live mode is the default and never substitutes invented reports for failures. Client query parameters cannot enable demo mode. `DEMO_MODE=true` is allowed only in a non-production runtime and selects the separate `demoPublicReports` collection. All demo surfaces disclose synthetic activity and disable engagement/resolution actions.

`npm run seed:demo` refuses production and requires a separate `DEMO_FIREBASE_PROJECT_ID` ending in `-demo`, distinct from the live `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, plus an appropriate demo credential and `DEMO_SEED_PASSWORD` of at least 12 characters. It writes no live `publicReports`. After seeding, run the local app against that separate demo project's Firebase configuration with explicit demo mode. Do not repoint a production deployment or commit credentials. The seed was not executed during this ticket.

## External/human launch gates

1. Deploy reviewed Firestore rules: direct client `publicReports` reads are denied; anonymous browsing uses the allowlisted API. Confirm private/default-denied collections and Storage rules with the real emulator/deployment security checks in Tickets 06/07. Old synthetic `publicReports` records are withheld; review legacy data without deleting user records automatically.
2. Verify deployed Firebase credentials/configuration and approved category labels using consented persisted live fixtures. Confirm accept/reject/merge and evidence approval/revocation immediately affect homepage, detail, photo access and insights. Test anonymous, invited resident and operator accounts. No production data was written during this ticket.
3. Verify the deployed MapLibre worker asset and public tile loading/CSP. The pilot basemap uses attributed OpenStreetMap standard raster tiles only on explicit map view; no offline prefetch or bulk download is implemented. Follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) (visible attribution, valid browser Referer, normal cache behavior). Service availability is not guaranteed; review provider capacity or replace the style adapter before expanding beyond this small pilot.
4. Complete physical-device touch, real screen-reader and Filipino comprehension checks. Emulated Chromium/axe evidence is not a substitute for human accessibility or resident usability testing.
5. Tickets 06/07 still gate abuse controls, monitoring, privacy retention/deletion, supporting-evidence hardening, two verified administrators, deployed end-to-end checks and release readiness. This ticket is not authorization for public rollout.
