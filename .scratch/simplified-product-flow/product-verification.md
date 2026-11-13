# Simplified product verification

Date: 2026-11-13 (Asia/Manila). Synthetic local evidence only. This closes implementation tickets 01–04; it does not authorize a deployment, invitations, production cleanup, or public release.

## Visible behavior

Public and resident status labels show Under review, In progress, Resolved, and Confirmed fixed. Legacy Assigned records display In progress, including the public filter, while their stored status and history remain intact. A disputed resolution adds Still a problem to the public timeline and returns the report to Under review. The private explanation stays available to authorized operators only.

The original reporter responds using Confirmed fixed or Still a problem. Retry refreshes current state while retaining the explanation. Expected revisions prevent stale responses from adding a second event. Get updates consolidates follow/affected subscriptions; Stop updates clears both legacy notification lanes without removing submitted protected evidence. Original-report notifications remain governed by Account preferences. Protected supporting photos remain reachable under a disclosure. Legacy internal affected state remains for existing delivery/preference compatibility; everyday impact counting is not presented.

Primary actions, advanced assignment, and backup takeover accept one English or Filipino message with an optional translation, each at most 1,000 characters. Missing translations remain missing. Public timelines, notifications, and operator history display the available message with its actual language. System outcome messages remain bilingual.

## Acceptance evidence

| Specification criterion | Dated local evidence |
| --- | --- |
| Short resident submission, relevant guidance and preserved drafts/retries | Ticket 02 resident-journey verification; intake browser and connected local-demo script passed on 2026-11-13. |
| Editable prepared draft and individual photo approval | Ticket 03 operator-flow tests and operator browser; protected evidence remains private by default. |
| Three normal operator actions with automatic ownership | Operator browser and real-SDK journey skip separate assignment and pass. |
| Atomic lifecycle state, projections, timeline, audit, notifications and applicable email jobs | Existing atomicity/conflict tests plus seven isolated real emulator contracts; new journey checks seven durable opt-in jobs through dispute and final confirmation. |
| Privacy-safe public content | Public allowlist/discovery tests; real-SDK and connected browser verify no private reason, owner UID, reporter UID or private submission leaks. |
| One resident dashboard and response to resolution | Ticket 02 dashboard; communication browser and response-conflict UI regression. |
| Private withdrawal and reviewed published removal | Ticket 02 domain/API/UI and real emulator contracts retained and passing. |
| Five role-aware primary destinations | Ticket 01 navigation tests; shared-shell report-pages browser and administration browser. |
| Advanced tools remain reachable and authorized | Administration browser exercises access/roles/configuration; operator browser exercises rejection and canonical duplicate handling; domain/API tests retain takeover, reassignment, external follow-up, privacy, retention and deletion authorization. |
| Legacy Assigned presentation without migration | Presentation and discovery tests; stored Assigned lifecycle contract retained. |
| English/Filipino, keyboard, focus, announcements, reduced motion, phone and failure/retry states | Intake, operator, communication, discovery, report-pages and administration browser checks; shared update fields, response conflict recovery, legacy subscription and optional-translation UI tests. Automated axe checks and text zoom pass. |
| Existing persistence and controlled-pilot safety | Full suite: 77 files, 328 tests passed with two workers. Real Auth/Firestore/Storage: seven contracts passed. No cloud services, actual participants or outbound email are used by these checks. |

## Reproducible checks

- `npm test -- --maxWorkers=2`: 77 files / 328 tests passed. An earlier concurrent run overlapped active red-test edits and hit an image-test timeout; the final bounded run passes.
- `npm run test:persistence`: seven contracts passed against local Firebase Auth, Firestore and Storage. Each run owns a unique named database, temporary users and Storage paths, and cleans only those resources.
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed on 2026-11-13.
- `node scripts/verify-intake-browser.mjs`, `verify-operator-browser.mjs`, `verify-report-pages-browser.mjs`, `verify-communication-browser.mjs`, `verify-discovery-browser.mjs`, and `verify-administration-browser.mjs`: responsive/function/accessibility checks passed with synthetic fixtures.
- `node scripts/verify-local-demo.mjs`: connected local Next.js/Auth/session/consent/Storage/submission/operator/resident flow. Both dispute and confirmation use the real UI and persist after reload.

## Capture index

All captures are synthetic and contain no real resident information. Under `artifacts/`, paired `desktop`/`mobile` files cover visitor discovery (`discovery-map-list-*`, `discovery-detail-*`), resident response (`communication-resolution-*`), the integrated resident dashboard (`report-pages-resident-*`), operator (`operator-*`), administrator (`administration-*`), and a private rejection receipt from the connected app (`local-rejected-*`). Filipino, tablet, and zoom captures supplement these pairs.

## Standards

Independent integrated review: no unresolved documented-standard violations or actionable heuristic findings.

## Spec

Independent integrated review: no unresolved blocking findings. The unified stop-subscription behavior and optional translation in advanced forms were corrected and verified. Final visual disposition: `ship`; required recaptures corrected synthetic fixture blanks, an unavailable fixture endpoint, and an inconsistent sample timeline.

## Remaining release gates

Deploy the notification and ownership composite indexes in `firestore.indexes.json` and verify READY before using their queries against a deployed database. Emulator success does not prove production index readiness, deployed rules/credentials, live email deliverability, human screen-reader/device usability, actual participant consent, accountable coverage or release approval. Existing controlled-pilot, emergency, pause, retention, privacy and deletion safeguards remain required.
