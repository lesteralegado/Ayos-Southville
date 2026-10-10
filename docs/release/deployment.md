# Deployment runbook

## Production

1. Create separate Firebase projects for demonstration and pilot environments.
2. Configure Email/Password authentication and authorized domains.
3. Deploy `firestore.rules`; provision restricted server credentials through the hosting secret store.
4. Set all Firebase public variables and verified emergency guidance. Keep `NEXT_PUBLIC_DEMO_MODE=false` and never set demo seed credentials in production.
5. Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build` against the release SHA.
6. Deploy, then execute the complete journey and release evidence checklist.

## Demonstration

Use a dedicated disposable Firebase project. Set both demo flags to `true`, choose a temporary seed password, and run `npm run seed:demo`. The command is idempotent for its labeled example users and reports. Remove the project or rotate credentials after portfolio review.

## Rollback

Retain the prior known-good deployment and Firestore backup. Roll application code back first; do not roll schemas or delete records until compatibility and recovery have been verified. Demo records carry `demonstration: true` and must not be combined with pilot findings.