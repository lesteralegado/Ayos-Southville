# Ticket 06: pilot privacy and operations

This is a controlled resident-led pilot, not a public-service production SLA. Code completion does not authorize deployment, deletion, export, email delivery, or restoration. Complete the gates below before inviting users.

## Ownership and launch gates

The accountable pilot owner is the project administrator (requested contact: alegadojohnlester@gmail.com). Before launch, that person must accept ownership, name a backup administrator, and confirm access to GitHub failure notifications, Firebase, the private evidence bucket, and Vercel. Do not put credentials or private records in tickets, logs, screenshots, or chat.

1. Provision a private Firebase Storage bucket; deploy the reviewed Firestore and Storage rules. Never enable public bucket access. Transfer administrator roles before approving an administrator's deletion.
2. Configure server-only `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `APP_SITE_URL` (production HTTPS origin), and separate random secrets of at least 32 characters for `AUDIT_PSEUDONYM_SECRET` and `RETENTION_WORKER_SECRET`. The application requires the split Firebase credential settings; the legacy seed script's JSON service-account setting is not a substitute. Preserve the audit secret in restricted recovery storage: changing it breaks erasure-ledger matching. Never prefix these settings with `NEXT_PUBLIC_`.
3. Independently record `RETENTION_TARGET_PROJECT` and `RETENTION_TARGET_BUCKET`; they must exactly match the live Firebase project and private bucket. Leave `RETENTION_APPLY_ENABLED=false` initially. Configure production and preview separately; preview must not point at live data.
4. Run `node scripts/pilot-operations.mjs check-env` locally with the intended settings. It reports setting names and booleans, never values. Run `node scripts/pilot-operations.mjs uptime` against the intended site. `/api/health` performs a Firestore read and bucket metadata check and returns only availability; missing security keys returns 503.
5. Configure GitHub repository variables `PILOT_SITE_URL`, `PILOT_FIREBASE_PROJECT`, `PILOT_STORAGE_BUCKET`, `PILOT_OPERATIONS_ENABLED=true`; add the server's matching `RETENTION_WORKER_SECRET` as a repository secret. Leave `PILOT_RETENTION_APPLY_ENABLED=false`. Confirm the owner and backup receive a deliberately failed test-run notification, then a successful manual workflow run. The independent runner checks uptime and previews cleanup approximately every 15 minutes; GitHub schedules can be delayed and are not a precise expiry SLA.
6. Review the first authenticated dry-run counts, configuration pins, recovery rehearsal, and backup expiry. Only then approve server `RETENTION_APPLY_ENABLED=true` and independently enable repository `PILOT_RETENTION_APPLY_ENABLED=true`. Review the first applied run in `/administration/operations` and GitHub. Disable both flags on unexpected counts, partial failures, or capacity errors.

The local read-only configuration check during implementation found missing Storage, site URL, audit secret and cleanup-worker secret. Production configuration and notification delivery have **not** been verified. No production apply, cloud backup/restore, rules deployment, GitHub scheduling enablement, or Vercel deployment was performed.

## Privacy and retention

Residents see the English/Filipino policy at `/privacy` and request deletion at `/account/privacy`, even without pilot approval. The administrator reviews the private queue at `/administration/operations`. Approval revokes participation and locks writes immediately; erasure happens only when the authenticated worker is enabled. Approval is deliberately distinct from successful completion. After approval, residents contact the administrator for status because the account is locked.

Unattached upload access expires at 24 hours; rejected private media at 30 days after rejection; pilot records at 90 days after the immutable recorded pilot end. Recording the end stops participation immediately. Cleanup physically removes eligible documents and files on its next successful run. Invalid legacy dates are preserved conservatively and require a reviewed repair; there is no silent guess. Minimal pseudonymous audit, cleanup and erasure records expire after 365 days. Raw reasons, descriptions, contacts and locations are excluded. UID-keyed public aliases are no longer readable and legacy entries are cleanup candidates.

Deletion disables Auth and revokes refresh tokens, removes owned reports and their media, supporting-photo links in other reports, engagement, receipts, preferences, invitations, profiles and identity mappings. A durable private work record survives partial failure. Completed requests lose the resident UID. Exceptions are a 24-hour UID security lock against old tokens, short-lived hashed rate/quota counters, a one-year HMAC erasure ledger, restricted backups for at most 30 days, and administrator continuity until role transfer. There is no indefinite hold. Do not restore or rotate the HMAC key without replaying erasures.

Authenticated cleanup defaults to dry-run:

```powershell
node scripts/pilot-operations.mjs cleanup
# Only after the approved gates; substitute independently verified targets:
node scripts/pilot-operations.mjs cleanup --apply --project=YOUR_PROJECT --bucket=YOUR_BUCKET
```

The worker uses POST `/api/internal/retention` with a timing-safe bearer check; secrets are not URL parameters. Apply requires matching server pins, explicit CLI pins, an enabled flag and a matching dry-run plan less than 24 hours old. Concurrent runs use a lease. Changed data requires a new preview. Failed Storage deletion retains its tombstone; retry with a fresh preview. No browser button applies cleanup. The legacy abandoned-evidence command delegates to this same worker.

This bounded pilot implementation refuses more than 500 profiles, 2,000 records in any retained collection, 10,000 retained records total or 5,000 scanned private files. `CAPACITY` is a launch/scale blocker: disable destructive mode and implement reviewed pagination/checkpoints before expanding the pilot. Partial runs require a new preview and another run. Do not bypass guards or delete broadly by prefix to resolve errors.

## Monitoring and incident response

Structured events allowlist operation, code, HTTP status and capped duration. API failures are generic; provider errors and request bodies are not emitted. Admin cleanup history contains aggregate counts only. `/api/health` does not test outgoing email or every report path: run a fictional-account intake/operator/resident smoke test after each release. Existing email delivery remains a separately authenticated integration.

On uptime failure or suspect privacy exposure: acknowledge within the pilot's agreed support hours; disable both apply flags; stop invitations; preserve only non-identifying timestamps/codes/deployment IDs; inspect Firebase/Storage permissions and Vercel release configuration; revoke compromised secrets; notify the owner and affected residents privately. Never paste identities or payloads into GitHub Actions logs. Resolve and document root cause; verify with fictional isolated data before resuming. If the audit key is compromised, treat rotation as an erasure-ledger migration, not a casual replacement.

## Backups and isolated recovery

Before destructive enablement, use a separate restricted backup bucket with a reviewed 30-day lifecycle policy. Back up Firestore, Auth and private Storage together; record project, bucket, UTC timestamp and release SHA privately. Assign export/import IAM narrowly. Firestore managed export requires billing and appropriate permissions; Auth password-hash configuration is sensitive. See [Firestore export/import](https://firebase.google.com/docs/firestore/manage-data/export-import), [Firebase Auth export/import](https://firebase.google.com/docs/cli/auth), and [Storage rsync](https://docs.cloud.google.com/sdk/gcloud/reference/storage/rsync).

Example operator commands (replace placeholders and verify exact targets first; never run against an inferred default project):

```powershell
gcloud firestore export gs://BACKUP_BUCKET/FIRESTORE_TIMESTAMP --project=LIVE_PROJECT
firebase auth:export AUTH_TIMESTAMP.json --format=json --project=LIVE_PROJECT
gcloud storage rsync gs://LIVE_PRIVATE_BUCKET/private-evidence gs://BACKUP_BUCKET/MEDIA_TIMESTAMP --recursive
# Isolated restore only, never the live project:
gcloud firestore import gs://BACKUP_BUCKET/FIRESTORE_TIMESTAMP --project=YOUR_PROJECT-restore-test
firebase auth:import AUTH_TIMESTAMP.json --project=YOUR_PROJECT-restore-test
gcloud storage rsync gs://BACKUP_BUCKET/MEDIA_TIMESTAMP gs://ISOLATED_PRIVATE_BUCKET/private-evidence --recursive
```

Auth imports may require the source project's reviewed hash parameters; do not guess them or publish them. Store the Auth export encrypted/restricted, delete its local copy recoverably after upload and verification, and record the removal. Do not add `--delete-unmatched-destination-objects`.

Set separate `RESTORE_TEST_PROJECT_ID` ending in `-restore-test`, `RESTORE_TEST_CLIENT_EMAIL`, `RESTORE_TEST_PRIVATE_KEY`, `RESTORE_TEST_STORAGE_BUCKET`, all distinct from live. The following smoke test creates and cleans up only UUID-named synthetic records/files in that isolated project:

```powershell
node scripts/verify-isolated-restore.mjs --project=YOUR_PROJECT-restore-test --bucket=ISOLATED_PRIVATE_BUCKET
```

This script verifies a synthetic SDK record/file backup-delete-restore roundtrip, not a complete managed export or Auth import. The full rehearsal is a human launch gate: import backups into isolation; preserve/import the **latest** erasure ledger and the original audit key; run cleanup preview and approved apply **against isolation** before allowing any traffic; verify erased identities and media remain absent, roles and reports work, counts reconcile, and private objects are inaccessible anonymously. The integration test separately proves erasure replay after an isolated snapshot restore. Never promote a restored database directly. Expire backup objects and Auth exports after 30 days and verify expiry with a sample object and access audit.

## Release rollback

Record the current production deployment ID and a known-good deployment before releasing. Test the known-good deployment with the current data schema and required secrets. An authorized operator can use `vercel rollback KNOWN_GOOD_DEPLOYMENT_URL`; inspect the resulting production deployment and run uptime plus the fictional-account smoke test. See [Vercel rollback](https://vercel.com/docs/cli/rollback). Rollback changes code routing, not database writes, rule changes, lost files or account erasure; never restore deleted identity data as a rollback shortcut. Leave cleanup disabled until code/data compatibility and erasure replay are confirmed.
