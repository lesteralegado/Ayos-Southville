# Ticket 03: operator lifecycle

## Delivered journey

The private `/moderation` workspace supports Submitted, Under review, Assigned, In progress, Resolved, Resident confirmed, Rejected, and Duplicate records. Moderators accept with explicit public redaction, reject with a reason, or merge a submitted duplicate into an approved active report. Coordinators assign priority and an active internal desk, start work, and resolve with actual completed protected photo uploads. Administrators have both sets of capabilities.

English and Filipino controls, role guidance, private/public labels, validation recovery, loading, pending, empty, failure, and conflict states preserve the Community Field Ledger identity. The interface uses native controls and announces authoritative outcomes. Connection interruption preserves entered text and asks the operator to reload before retrying.

## Privacy and consistency

- Submission no longer creates a public Firestore document. Public service reads and Firestore rules require explicit approval; Submitted and Rejected content remains private. The original reporter still receives an authenticated receipt. Legacy public documents without `approved: true` are withheld; do not bulk-approve them without a privacy review.
- Acceptance uses only the explicitly approved summary, area, rounded coordinates, and selected media identifiers with alternative text. Private descriptions, household details, decision reasons, and submission history are excluded from the public projection.
- Storage files remain private. `/api/evidence/[id]` keeps its authenticated restricted access. `/api/public-evidence/[id]` serves bytes only when that particular attachment appears in the current approved public projection. It issues no public Storage URLs or download tokens and uses no-store responses. Unselected evidence and resolution evidence stay restricted.
- Every lifecycle mutation commits moderation state, resident status, public projection, notifications, and an immutable audit event in one Firestore transaction. Browser actions carry the observed revision; stale or repeated actions fail with a conflict. Failed commits cannot leave a partial lifecycle.
- Assignment rechecks the active desk inside the transaction. Resolution validates current upload ownership, report-specific draft scope, expiry, deletion/attachment state, and physical file existence. Stored metadata replaces client declarations; attachment and resolution commit together.
- Merging retains both private histories and evidence, stores canonical relationships, follows the canonical report for the duplicate reporter, transfers engagement, and notifies affected residents. An original reporter's duplicate receipt redirects to the canonical report.
- Optional email requests are independent of committed report state. Actual email delivery and notification preferences remain Ticket 04 work.

## Local verification

`npm run verify:operator` runs the actual UI and moderation/evidence application boundaries through a Vite fixture with synthetic records and private storage adapters. It uses real image preparation. It covers redaction, assignment, work start, confirmed resolution upload, rejection, merging, restricted roles, direct forbidden requests, connection interruption/recovery, privacy outcomes, stale conflicts, and audit persistence.

The fixture adapts Next Link and external persistence/authentication; it does not establish production Firebase/Auth integration. Separate Firebase adapter tests exercise the actual adapter with controlled database transactions and Storage responses, including wrong owner/report, expired/deleted/attached uploads, missing physical files, server metadata, public-media approval, active routing, and rollback.

Visual captures are local and ignored under `.scratch/ayos-southville-production-completion/artifacts/operator-*.png`: desktop 1440×1000, tablet 768×1024, phone 390×844, and Filipino phone. The batched inspection found a selected-date contrast failure and inherited mobile CSS hiding refresh. Both were fixed together. Confirmation passed automated WCAG A/AA axe checks, overflow, visible keyboard focus, reduced-motion preference, and 200% text size. Later functional fixes used `--functional-only` without further visual polishing.

Human screen-reader traversal, physical devices/browser zoom, Filipino copy review, weak-network testing, and consented two-account production verification remain release gates.

## Deployment checks

Final local gates: typecheck and source/script ESLint passed; all 118 tests across 32 files passed with `--maxWorkers=2`; the production build passed; the functional browser journey passed after review fixes. Standards review against `bcaa8f3` found one redundant revision check, now removed. Spec review corrected misleading rejected-receipt history/copy, optional wording on required resolution uploads, and stale supporting-evidence hydration (with a regression test). Both axes have no remaining findings.

1. Provision private Firebase Storage and set server-only `FIREBASE_STORAGE_BUCKET`; retain `storage.rules` denying direct client access. See [intake verification](intake-verification.md).
2. Deploy the revised `firestore.rules` as well as the application. Vercel deployment alone does not publish Firebase rules. Confirm that anonymous clients cannot read legacy unapproved, Submitted, or Rejected records.
3. With consented resident/operator accounts, submit a real report and inspect restricted details. Accept with a safe public summary/area and selectively approve photos. Verify anonymous public reads, another resident's denied restricted-file request, and selected public media.
4. Assign an active internal desk, start work, upload real resolution photos, and resolve. Verify resident status, bilingual timeline, notifications, audit events, and protected resolution files against persisted records.
5. Repeat an action from a stale browser session; verify conflict without duplicate timeline/audit/notification events. Check rejection, duplicate transfer, canonical receipt redirection, and revoked/forbidden access.

No production records, provider configuration, or Firebase rules were mutated during local implementation. The second verified administrator and the broader release gates remain open.
