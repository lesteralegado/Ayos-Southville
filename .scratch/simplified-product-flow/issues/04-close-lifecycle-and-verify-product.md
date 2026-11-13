# 04 — Close the lifecycle and verify the product

Status: resolved

Blocked by: 03

## Outcome

Present one truthful public lifecycle, complete the resident response and Get updates flows, and prove the integrated simplified product preserves privacy, accessibility, persistence, and controlled-pilot safety.

## Scope

- Present Under review, In progress, Resolved, Confirmed fixed, and Still a problem in resident/public language.
- Render legacy Assigned records as In progress without rewriting stored status or history. Keep ownership internal.
- After Mark resolved, notify the original resident and show Confirmed fixed and Still a problem. Confirmation closes the report; continued concern returns it to review with the explanation preserved.
- Replace separate Follow and This affects me controls with Get updates; retain internal distinctions only if an active consumer requires them.
- Keep bilingual system copy and one operator-authored message with optional translation.
- Run the complete resident-to-operator-to-resident journey against the strongest authorized local persistence environment.
- Reconcile navigation, copy, status presentation, empty states, and advanced links. Remove obsolete presentation paths only after proving no capability becomes unreachable.
- Update operational/verification documentation for changed visible behavior and perform Standards and Spec reviews over the integrated diff.

## Verification

- Test legacy status presentation, resolution notification, authorized resident confirmation/dispute, stale requests, retries, and automatic public/resident timeline updates.
- Test Get updates authorization and notification behavior; verify public projections never expose ownership or private data.
- Run focused checks from Tickets 01–03, the full unit/integration suite, persistence suite where available, typecheck, lint, production build, and affected browser verification scripts.
- Capture private-data-free phone/desktop evidence for visitor, resident, operator, and administrator journeys.
- Confirm no debug instrumentation, duplicate stale UI, or unreachable advanced control remains.
- Resolve all blocking Standards and Spec review findings while keeping deployment and human release gates explicit.

## Completion criterion

Every specification acceptance criterion has dated evidence; all required checks pass; Standards and Spec reviews have no unresolved blocking findings; the simplified journey works end to end; no production deployment or release claim is implied.

## Answer

Completed 2026-11-13 (Asia/Manila). See [integrated product verification](../product-verification.md) for the acceptance matrix, capture index, reproducible checks and release gates.

- Legacy Assigned renders In progress without rewriting records; confirmation displays Confirmed fixed and a dispute adds Still a problem to the timeline while returning to review.
- Get updates consolidates both legacy subscription lanes; stopping updates retains protected supporting evidence. Authorization and real persisted notification delivery are tested.
- Normal and advanced operator updates require one message, allow an optional translation, and display the actual language. Retry retains the resident explanation across revision refreshes.
- Final full suite: 77 files, 328 tests passed. Seven real Auth/Firestore/Storage emulator contracts passed. Typecheck, lint and production build passed.
- Intake, operator, communication, discovery, report-pages and administration browser suites passed. The actual local Next.js/Firebase journey passed submission through dispute, follow-up resolution and confirmation/reload.
- Standards review: no unresolved findings. Spec review: no unresolved blocking findings. Visual finish: `disposition: ship` after correcting synthetic capture fixtures.
- No production deployment or release claim. Composite index READY checks and human/deployed release evidence remain explicit prerequisites.
