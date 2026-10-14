# No-billing local verification

Latest evidence (2026-10-15): Java 21 installation, emulator startup, synthetic seeding and the connected local resident-to-operator-to-resident workflow now pass. See [local demonstration verification](../release/demo-verification.md). The older verification record below remains historical. Reopen PowerShell after Java installation so its updated PATH is available.

This setup runs Auth, Firestore and private photo Storage on your computer. It uses the synthetic demo-ayos-southville-local project, not ayos-southville or ayos-southville-staging. No Firebase login, service-account key, credit card, cloud bucket or copied production data is required. It is development verification, not deployed readiness or release approval.

## Prerequisites

Use Node.js 24 and Java 21 or newer. Install a Windows x64 JDK from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21); enable its PATH option, optionally JAVA_HOME, then reopen PowerShell. Do not change Firebase billing. Run npm install in C:\project to install the pinned Firebase CLI.

```powershell
cd C:\project
java -version
npm run local:check
```

Both java21Available and firebaseCLIAvailable must be true before startup. The check prints only public synthetic targets and prerequisite booleans. It does not verify running services. Emulator binaries/UI may download on first startup; this uses internet bandwidth, not paid Firebase resources.

## Start locally

Terminal 1:

```powershell
npm run local:emulators
```

Wait for Auth, Firestore, Storage and the Emulator UI to start. Terminal 2:

```powershell
npm run local:seed
npm run local:app
```

Visit http://127.0.0.1:3001 for the application and http://127.0.0.1:4000 for the Emulator UI. Stop each terminal with Ctrl+C. No export/import is configured: synthetic records are disposable and should not be expected to survive emulator shutdown. Repeat local:seed after restarting the emulators. Do not run the ordinary npm run dev command for isolated testing; it uses your normal environment instead.

The seed creates only local verified test accounts/profile access:

| Role | Synthetic email |
| --- | --- |
| Owner administrator | local-owner@example.test |
| Backup administrator | local-backup@example.test |
| Resident | local-resident@example.test |

Their deliberately public LOCAL-ONLY password is LocalTestOnly-2026! Never reuse it on a cloud account. Seed is idempotent: existing users/profiles are not overwritten. No consent, coverage acceptance, calendar verification, trial approval, reports or resolved outcomes are prefilled. In the local app, accept participation disclosure deliberately, configure test coverage and categories through existing administrator controls, then exercise a labelled fictional non-emergency report, review/progression, photo evidence, notifications and resident confirmation/dispute. Emulator verification emails appear locally rather than being delivered; this does not demonstrate real email delivery or real administrator acceptance.

## Isolation and limits

- Startup forces the exact synthetic project, matching local bucket and loopback Auth/Firestore/Storage ports. It binds application and emulator listeners to 127.0.0.1, refuses hosted/production runs and does not accept target overrides.
- The server refuses partial/remote emulator configurations and uses no live service-account credential in emulator mode. The browser connects Auth and Firestore to loopback; photo operations remain server-side through Storage emulator configuration. Cached live project connections are refused. Never set emulator flags/hosts on Vercel.
- Existing .env.local is preserved, not rewritten. Explicit child-process configuration overrides Firebase targets and disables live email sending, destructive retention application and restore credentials. Local Next output is separate in .next-local. Normal production settings/build behavior remains unchanged.
- Existing Firestore/Storage rules are reused. Storage direct client reads/writes remain denied. Emulator UI and Admin SDK are privileged local tooling, not proof of cloud IAM or bucket privacy. Anyone with access to your computer can inspect the synthetic local data; use no real identities, homes, photos or passwords.
- All synthetic records are local exercises. They never justify reporting real participants, community repairs, cloud performance, managed backup recovery, billing readiness or release approval. Provider-specific APIs may differ, including bucket metadata checks; do not bypass readiness or claim their cloud equivalents passed based on emulator behavior.

## Verification record — 2026-10-13

Connection/startup safety tests exercise actual SDK initialization plus the observable local startup command. Java is currently absent on the checked workstation: local:check reports false and local:emulators stops with the prerequisite instruction before launching services. Firebase CLI 15.33.0 is installed and its version command succeeds. Live emulator startup, local seeding, photo roundtrip and the connected browser/API journey are NOT yet verified.

Local automated verification: 61 files / 248 tests passed, including 15 connection/startup regressions at owner-approved seams. TypeScript, production build, script syntax and scoped lint passed. The lockfile change adds development CLI tooling; comparison against 9a25f19 found no changed existing production package versions. Calling the seed outside the isolated local environment is refused before SDK initialization. These checks do not stand in for the Java-blocked live emulator/browser test.

Independent parallel review of implementation fe56d76 against owner-approved 9a25f19: Standards found zero documented breaches and one optional endpoint-constant duplication advisory. Spec found no actionable local-setup mismatch, explicitly limiting its conclusion to configuration and guards rather than live persisted emulator behavior. No UI composition changes or production release were made. Local setup implementation is committed separately from the still-open Ticket 05 release gate.

Dependency installation reported 21 audit findings (10 moderate, 11 high). Production-only audit reported eight moderate findings in the current Firebase Admin dependency tree, no high/critical findings. These are not silently repaired via a force upgrade; dependency security remains an open release consideration. Local tooling installation is not launch approval.

See [Ticket 05 evidence](../release/operational-readiness-verification.md). Ticket 05 and the historical release/evaluation gates remain unresolved even after successful local testing.

Sources: [Firebase demo-project isolation](https://firebase.google.com/docs/emulator-suite/connect_firestore), [Auth emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [Storage emulator](https://firebase.google.com/docs/emulator-suite/connect_storage), [Emulator prerequisites/configuration](https://firebase.google.com/docs/emulator-suite/install_and_configure).
