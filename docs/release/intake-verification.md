# Ticket 02: real report intake

## Delivered flow

Approved verified resident → configured category and private draft → optional real private photo upload → optional MapLibre point or coordinates (landmark-only works) → public-only duplicate choice → idempotent submission → existing reference receipt.

The existing application, API, and browser boundaries were used. Impeccable preserved the Community Field Ledger identity, bilingual task copy, native controls, and optional non-map reporting. A first batched desktop/tablet/mobile inspection identified an inherited rule hiding quiet actions on small screens. It was fixed together with the redundant active-draft banner; one confirmation round followed. No new visual world or unrelated design changes were introduced.

## Security and recovery

- Every upload requires a verified, approved session and same-origin mutation. Streamed request bodies are bounded to 1.7 MB; compressed image payloads are capped at 1.6 MB. Server decoding validates JPEG/PNG/WebP, rejects spoofed/animated images, limits decoded pixels, and strips metadata (including GPS) by re-encoding JPEG.
- Real bytes are stored at randomized private Storage paths. No signed/public URLs or Firebase download tokens are issued. Photo reads authenticate ownership, or approved operator access to attached evidence; responses are private/no-store. Direct Storage client access remains denied by `storage.rules`.
- Firestore transactions cap each draft at five active uploads and each resident at 50 new photos/day. Slot identities make upload retries idempotent; cancellations leave tombstones so in-flight requests cannot resurrect removed photos. Server metadata—not client filenames, sizes, or MIME declarations—is attached atomically with the report and receipt.
- Submission rejects absent, wrong-owner, wrong-draft, removed, expired, already-attached, or physically missing uploads. A receipt lookup happens first, so a lost submission response is recoverable even after attachment. Draft text and compressed blobs are scoped by resident and draft; IndexedDB supports interrupted upload recovery. Original filenames are not sent or persisted.
- Exact coordinates and household details are absent from public projections. Public points are rounded to two decimal places. Original reporter access to their own private record is retained; other residents receive only public data. Duplicate suggestions are explicitly allowlisted, accepted unresolved records, never raw Firestore documents.
- Duplicate support currently records “affected” without attaching draft photos, and the UI discloses that. The old metadata-only supporting-evidence API path is denied until a separately scoped real attachment workflow is delivered.
- An uncertain submission freezes editing and offers receipt recovery using the same key. A duplicate-check outage does not falsely mark a submission as sent. Optional map failure does not block landmark or coordinate entry.

## Verification evidence

`npm run verify:intake` exercises actual intake components and application modules with synthetic private storage adapters and real image decoding. It verifies a stored upload whose response is deliberately lost, reload/resume, restricted preview, removal, upload confirmation, real MapLibre with controlled raster tiles, duplicate choice, and landmark-only receipt. It does **not** impersonate a production login or claim a deployed Firebase journey.

Captured sizes: 1440×1000, 768×1024, 390×844; English and Filipino phone captures. Automated axe WCAG A/AA checks passed at all three sizes, with no horizontal overflow. Keyboard focus, 200% text zoom, and reduced-motion browser preference were exercised. Artifacts are local and ignored under `.scratch/ayos-southville-production-completion/artifacts/intake-*.png`.

The MapLibre 6 worker requires an explicit bundled worker URL; a functional-only check after that runtime correction avoids a third visual round. Its Vite fixture adapts only the worker URL and Next navigation; the production Next build uses the documented emitted-asset URL.

Focused tests cover unauthorized/unapproved upload, bounded byte handling, private reads, storage failure, server image verification, canonical attachment, wrong-owner/draft/missing/deleted/expired files, idempotent receipt recovery, configured categories, and accessible landmark-only intake. Final test/typecheck/lint/build results are recorded in the ticket Answer.

## Deployment and external gates

Local configuration presence check: project ID, Admin email, and Admin private key are present; `FIREBASE_STORAGE_BUCKET` is absent. No credential values were printed. The built application's unauthenticated `/api/evidence`, `/api/evidence/[id]`, and `/api/reports/receipt` returned 401; `/reports/new` returned 307 to sign-in. These smoke checks do not exercise authenticated production storage.

1. Provision/confirm the **private** Firebase Storage bucket and billing requirements in the intended project. Set server-only `FIREBASE_STORAGE_BUCKET` locally and in the correct Vercel environments; do not put credentials in public variables or commit `.env.local`. Keep preview/test data separate from production. Existing Admin credentials need the necessary scoped bucket permissions.
2. Deploy and verify `storage.rules` (deny all direct client reads/writes). Confirm bucket IAM has no public object-read grants. Rules alone do not revoke public Google Cloud IAM grants. The Admin SDK performs the authorized operations behind Next routes; bucket CORS is unnecessary for this same-origin upload design.
3. Deploy the committed application; verify with two consented test accounts: an approved resident can submit a real photo; an unapproved resident cannot upload; another resident cannot fetch its bytes; an authorized operator can read attached evidence; no private content enters public records. Verify reload/retry and the reference receipt against real persisted records, without exposing credentials or identities in evidence.
4. Schedule `scripts/cleanup-abandoned-evidence.mjs` at least daily in a trusted operator environment (Ticket 06). It is read-only by default. After inspecting its dry-run counts, explicit deletion requires `--apply --project=<exact-project-id> --bucket=<exact-bucket-name>`. The script only targets this feature's randomized private paths, expired unsubmitted files, and crash-window orphans; attached evidence is protected. Expired uploads are denied immediately after 24 hours even if cleanup has not yet run. Storage deletion is permanent; do not execute it against an unverified target.
5. Human screen-reader traversal, browser zoom/reflow, real-device checks, Filipino language review, and weak-network production testing remain release gates. Automated checks are not a substitute for those checks or consented usability evidence.

## Provider notes

The small pilot requests standard OpenStreetMap tiles directly over HTTPS, with visible attribution, ordinary browser caching and Referer, max zoom 18, and only when the resident opens the optional map. There is no tile prefetch, offline download, proxy, or bulk-load verification. The picker discloses the provider's receipt of IP/viewed area. Move to a supported commercial/self-hosted provider if scale or service reliability needs exceed the volunteer policy.

Primary documentation: [Firebase Admin Storage](https://firebase.google.com/docs/storage/admin/start), [MapLibre 6 worker setup](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Standards

Review against `13402e8`: no remaining code-standard findings. The optional duplicated-removal smell was resolved with one owned-draft deletion transaction; the tracker is updated at completion.

## Spec

The review identified receipt recovery failing if an administrator disabled the submitted category after a lost response. A failing regression reproduced it; the correction recovers existing receipts before mutable validation and provides an authenticated owner-scoped receipt endpoint for resumed drafts. Domain, API, and UI tests cover it. Re-review found no remaining blocking Spec findings.

Summary: 0 remaining Standards code findings and 0 remaining blocking Spec findings. External release gates above remain open. Final verification: 100 tests/29 files, typecheck, changed-code lint, and production build passed.
