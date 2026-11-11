# Local persistence contracts

Start the isolated emulators using the [local emulator instructions](local-emulators.md), then run:

```powershell
npm run test:persistence
```

This command runs three real Admin SDK checks through the existing report and moderation module interfaces: simultaneous same-key submission recovery, moderation rollback after a late immutable-outbox collision, and competing actions at one report revision. Assertions cover receipts, report status, private/public projection, notifications, audit history and outbox records. No email worker or external delivery runs.

The checks refuse hosted/production execution and require the fixed loopback Auth, Firestore and Storage services advertised by the local emulator hub. They configure only the synthetic `demo-ayos-southville-local` project, create a unique `contracts-…` named Firestore database and synthetic Auth user, and delete only records in that owned database plus the owned user afterward. They never clear or configure the application's shared default database. A stopped or mismatched hub fails the command; the ordinary unit suite does not silently skip or claim these checks passed.

The connection seam substitutes the named real-emulator database and Auth instance. Report/moderation implementations, authorization/consent checks, Firestore transaction retries and commit behavior execute unchanged. Fixtures create a synthetic approved administrator with a valid consent receipt in the owned database. These exercises do not demonstrate real participant consent, operator acceptance, cloud IAM, deployed performance or release readiness.

The ordinary `npm test` suite separately verifies the shared Firebase double's rollback, read-before-write ordering and serialized transactions, then reuses it in report and moderation adapter tests. The double is intentionally limited test infrastructure, not a replacement for real-emulator contracts.

If a process is terminated before cleanup, inspect only the uniquely named database and `contracts-…` Auth user reported by that run. Do not clear the shared emulator project to clean up one contract run. Emulator data remains disposable when the owning emulator process stops.
