# Firebase Admin hosted-runtime compatibility

Incident diagnosed 2026-11-11 (Asia/Manila). The deployed public reports, health and pilot-status endpoints returned empty HTTP 500 responses. Vercel logs identified `ERR_REQUIRE_ESM` while importing Firebase Admin Auth: `jwks-rsa` synchronously required ESM-only `jose` before route error handling could run. The project already used Node.js 24.

The same failure was reproduced locally with `node --no-experimental-require-module`, explaining why ordinary Node 24 builds and tests did not catch it. This is tracked upstream at [Firebase Admin issue 3181](https://github.com/firebase/firebase-admin-node/issues/3181) and [jwks-rsa issue 507](https://github.com/auth0/node-jwks-rsa/issues/507).

## Fix

The npm override is scoped to `firebase-admin` → `jwks-rsa` → `jose`, selecting CommonJS-compatible `jose` 5.10.0. Firebase Admin remains at 14.5.0; unrelated tooling retains its existing jose 6 dependency. The committed lockfile must accompany the override. This temporary compatibility constraint should be removed only after an upstream-compatible release passes the restricted-runtime regression.

`npm run verify:server-runtime` runs a separate Node process with `--no-experimental-require-module`. It loads the real Firebase Admin Auth, Firestore and Storage modules, initializes a synthetic app without contacting providers, and exercises the actual JWKS signing-key conversion with a generated RSA key. Valid signatures must verify and tampered content must fail. No authentication checks are disabled, production credentials are unnecessary, and no cloud data is written. CI runs this check immediately after the locked install.

Before the override this command failed with the exact deployed `ERR_REQUIRE_ESM`; afterward it passed. This reproducer is the regression test rather than a module mock that would hide the dependency failure.

## Local verification

On 2026-11-11, the runtime regression, all 278 tests across 66 files, zero-warning lint, TypeScript and the standard production build passed. The built server was also started with CommonJS require(ESM) disabled and explicit invalid credential fixtures. Public reports, health and pilot-status returned their handled HTTP 503 configuration responses instead of empty startup HTTP 500 responses. The public-report output trace includes the compatible CommonJS jose files. These fixture failures demonstrate startup/error handling, not configured Firebase readiness. The temporary local server was stopped afterward.

## Deployment verification

Commit and push the package manifest, lockfile, runtime-check script, workflow and this record together. After the resulting authorized deployment finishes, rerun the public reports endpoint and inspect runtime logs. Its response must no longer be an empty startup HTTP 500. A separate configured-service error must be diagnosed on its own evidence; this compatibility fix does not prove Firebase credentials, indexes, consent, release approval or real participant readiness.

Local verification does not claim that the production deployment has already been repaired.
