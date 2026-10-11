# Ticket 06 verification

Baseline: Ticket 05 commit `738aa70`. User-approved seams: account, administration, report/evidence/engagement APIs and new retention/cleanup/recovery boundaries.

## Local evidence

- Full Vitest run: 49 files, 158 tests passed. Subsequent focused runs cover four added worker-authentication, full-draft recovery, malformed-evidence and accessible-validation regressions; total tests are now 162. The draft recovery regression failed before the fix, then passed through the real evidence/cleanup adapters.
- TypeScript and ESLint passed; optimized Next.js build passed.
- `node scripts/verify-hardening-browser.mjs` passed the real privacy module behind an isolated API adapter: request confirmation, persisted receipt, administrator review, non-destructive preview, recorded end, permission denial, offline retry and private/public separation. Firebase adapter integration tests separately verify Auth/document/Storage erasure, retry after failed Storage deletion, dry-run plan checks and erased-identity replay after restoring a synthetic snapshot.
- One completed batched visual inspection covered resident EN/FIL, administrator and public policy at desktop 1440, tablet 768 and phone 390 widths. Screenshots are local artifacts named `hardening-*.png` under the feature's artifacts directory. Review added programmatic date-error association; one confirmation batch passed. Axe WCAG 2.2 checks found no violations; keyboard focus, live feedback, 200% text zoom, no horizontal overflow and reduced-motion configuration passed. This does not replace a human screen-reader session.
- `node scripts/verify-hardening-build.mjs` passed against the locally started production build: bilingual public-policy hydration, private-route redirects, unauthenticated worker refusal, no-store API failures, and missing-configuration health refusal. The health failure is expected until launch settings exist; no provider secrets were used in this check.

## Required review against `738aa70`

### Standards

The independent review identified one documented accessibility violation: DESIGN.md requires errors associated with controls and programmatic invalid state; the pilot-end date had only a global alert. Fixed with `aria-invalid` and the error ID in `aria-describedby`, verified by a UI behavior test.

Two judgment-call baseline smells were identified: duplicated evidence validity checks had diverged on malformed timestamps, and an unused deletion-completion helper duplicated the worker. Fixed by sharing `evidenceAvailable` across intake, support, resolution and read boundaries, adding malformed/expired evidence coverage, and removing the unused helper.

### Spec

The independent review identified one P2: cleanup removed expired upload documents but left five stale IDs filling the draft counter, preventing replacement upload after recovery. Fixed by transactionally reconciling draft IDs against live owned evidence before enforcing capacity. A boundary test reproduces five expired uploads, actual cleanup, and successful replacement upload.

Initial findings: Standards 3 (worst: error accessibility); Spec 1 (worst: expired-full-draft recovery). All were addressed; production/human release gates remain separate.

Both reviewers independently confirmed the fixes against the amended commit. Remaining findings: Standards 0; Spec 0. Final production rebuild and UI confirmation passed after the fixes.
- Read-only environment check reported missing Storage, site origin, audit key and retention-worker key; apply disabled. The isolated restore command refused missing isolated-project configuration without creating cloud resources.

## Remaining release gates

Follow `pilot-operations.md`: owner/backup acceptance, server configuration, private bucket and revised rules, failure-notification delivery, independent scheduler enablement, reviewed production dry-run, isolated managed Firestore/Auth/Storage restoration and backup lifecycle expiry, then explicit destructive enablement. No production cleanup, backup restore, rule deployment, push or Vercel deployment occurred during implementation. Ticket 07 owns the live two-account release verification; this ticket must not be described as public-launch approval.
