# Ticket 05: Operational release readiness

Status: NO-GO / incomplete. Checked 2026-10-12, approximately 21:14 Asia/Manila. This records read-only observations, not release approval or a completed deployment review.

## Target and provenance

Intended production origin: https://ayos-southville.vercel.app. Vercel project ayos-southville, project ID prj_H3AK9O7zM2PRsfuI4pExZ4g6yP38, team ID team_mUbUGUMG1eslkaPpYYkmn0dn. The production alias resolves to deployment dpl_5bh6y5Uivz8AWUeMUHmwzX9LnKYc, URL https://ayos-southville-a08pccox8-lesters-project.vercel.app. Vercel reports READY; creation time is 2026-10-12 00:16:34 Asia/Manila. READY is a deployment-build state, not application readiness.

GitHub main currently resolves to 60f9f0478b601cf730e4de0d9af4e786c7635b2f via git ls-remote. Local main is 9a25f19, twelve commits ahead. The operating Tickets 01–04 are therefore not on GitHub main. The deployment inspection exposed no Git commit metadata, so its exact source SHA is unverified; do not equate it with either SHA merely from deployment age.

Authenticated Vercel connector deployment listing returned a scope-permission error. A read-only CLI fallback with the same explicit team/project succeeded and identified the production deployment. No authentication, linking, provider settings or aliases were changed.

## Current public read-only probes

| Endpoint | HTTP | Interpretation |
| --- | --- | --- |
| /api/health | 503 | Body status unavailable; launch blocker. Exact cause not established. |
| /api/pilot-status | 404 | Current production does not expose the new public pilot-status endpoint. |
| /api/operations | 401 | Anonymous access refused; does not prove administrator access. |
| /api/pilot-measurement | 401 | Anonymous access refused; does not verify the new record/read journey. |
| /api/moderation | 401 | Anonymous access refused; does not prove role enforcement for authenticated actors. |

Health checks security-key configuration, a Firestore read and bucket metadata. Its generic response cannot distinguish a missing setting from provider credentials, permissions or service failure. No secret values or private report data were retrieved. No synthetic participant/report data was written.

## Required next evidence

1. Obtain explicit authorization before pushing main: the push may trigger production deployment. Verify the resulting intended commit/environment and rerun health. Review required production settings and private Storage/provider permissions without disclosing credentials.
2. Establish a separate non-production deployment and Firebase/Storage targets, then explicitly authorize creation/removal of labelled test data there. The supplied Firebase console project ayos-southville alone does not prove staging isolation.
3. Both intended administrators personally demonstrate verified access, ownership/backup acceptance and the configured coverage/calendar. Names, email addresses and role fields are not a pass.
4. Run the connected stored-evidence resident → operator → resident journey, direct access/consent/pause/takeover checks, genuine test-scenario media, notifications, confirmation/dispute and privacy-leak checks in the approved environment. Local provider fixtures are not this deployed evidence.
5. Record dated human device, keyboard, screen-reader, actual 200%/400% zoom, forced-colors, reduced-motion, bilingual and slow-network results. Measure representative deployed 100-report/25-media response and useful-content p75, with sampling/waterfall artifacts.
6. Separately authorize and verify alert delivery, authenticated cleanup preview/application, managed isolated restore with latest account and measurement erasure replay, and rollback rehearsal. Validate exact targets before destructive operations.
7. Obtain an accountable human go/no-go decision only after all required gates pass. Until then, no release approval or recruitment authorization is recorded.

Ticket 05 remains unresolved. Historical [release evidence](pilot-release-evidence.md), parent effort and Ticket 06 gates remain open. No push, deployment, rules/role/environment changes, invitation sending, cleanup or restore was performed. Final review baseline confirmation and subsequent verification/commit are pending; this initial evidence file is not a reviewed completion record.

## Subsequent events — local setup, 2026-10-13

The preceding observations are historical, not a claim about the current deployment. After explicit owner authorization, main was pushed successfully to GitHub at 9a25f19 and the remote SHA was verified. A resulting Vercel deployment or current health was not established by that push. The owner supplied staging project ID ayos-southville-staging and reported configuring its web app, Email/Password Auth and Firestore; cloud isolation/settings are not independently verified.

The owner declined paid Storage/billing and explicitly chose local emulator verification without removing photo-evidence features or replacing providers. A synthetic demo-project Auth/Firestore/Storage setup is provided in [local emulator instructions](../pilot/local-emulators.md). It does not use either real Firebase project and it is not a substitute for Ticket 05's deployed, human, monitoring or recovery evidence. Java 21 is absent on the checked workstation, so live emulator startup and the connected local workflow remain pending. Local configuration is not readiness approval. Review baseline 9a25f19 and connection/startup test boundaries were explicitly approved.
