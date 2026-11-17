# Reporting flow refinement

Status: resolved

Date: 2026-11-13 (Asia/Manila)

## Agreed outcome

Residents submit concerns, track progress, answer requests for information, and request archiving. Operators preview the resident-derived public draft, approve and publish, start work, and mark reports resolved. Each report exposes one main action appropriate to its current state; secondary tools remain available under More options.

Approval preserves the submitted concern and selected map pin without re-entry. Operators may correct wording and remove private information; substantive changes to the concern or location require clarification from the resident. Photos remain individually reviewed before publication.

Residents see three main progress steps: Submitted, In progress, Resolved. Publication, requests for information, decline reasons, resident confirmation/dispute, and archive decisions remain explicit supporting information rather than being silently discarded.

Meaningful notifications open the relevant report: publication, work started, clarification requested, resolution, decline, and archive approval. Existing user preferences, optional email, private/public separation, and historical notifications remain respected.

After confirmed participation consent, Account shows a compact confirmation and expandable details. Privacy controls and sign-out remain easy to find. Secondary functions are disclosed progressively; no necessary capability is removed without a separate decision.

## Comparison with the current implementation

| Area | Evidence | Treatment |
| --- | --- | --- |
| Resident-derived publication draft | `src/features/reports/public-report-draft.ts`, `primary-report-action.tsx` | Already implemented; regression coverage only |
| Approve/publish, start, resolve | `primary-report-action.tsx`, `operator-workspace.tsx` | Already implemented; integrate clarification attention without rebuilding |
| Exact selected pin | `.scratch/report-pin-accuracy/`, draft preparation | Already implemented; preserve and test |
| Reviewed archiving and private history | `.scratch/report-archiving/spec.md`, archive queue | Already implemented; preserve and test |
| Repeated consent disclosure and language switch | `resident-panel.tsx`, `consent-panel.tsx`; QA-06/07 | Ticket 01 |
| Small authentication switch target | QA-05 in the QA audit | Merge into ticket 01 |
| Requesting and answering clarification | No matching report clarification flow found in `src/features` or `src/app` | Ticket 02, one complete private vertical slice |
| Three-step resident progress | `report-presentation.ts` currently exposes Under review and Confirmed fixed as status labels | Ticket 03, presentation change with historical semantics retained |
| Notification destination and noise | `notification-center.tsx` links every event to `/reports/<reference>`; engagement confirmations also appear | Ticket 04, verify private destinations and meaningful new events |

## Relationship to earlier specifications

The four tickets in [simplified-product-flow](../simplified-product-flow/map.md) remain resolved. This effort contains only follow-up gaps and regression requirements, not replacement copies of that work.

The earlier spec's Under review and Confirmed fixed labels remain valid domain/history concepts. This agreement changes the primary resident progress presentation, not stored status values. Preserve the glossary's distinction between report review and a repair guarantee, including resident confirmation or continued concern. Do not rename domain statuses or migrate historical records to achieve a shorter UI.

The glossary still uses public report removal-request terminology; the implemented [archive specification](../report-archiving/spec.md) governs the current user-facing action. Avoid silently rewriting the independently modified glossary in this effort.

## Boundaries

- Preserve authorization, verified ownership, consent eligibility, revision checks, transactional persistence, minimized audits, retention and deletion protections.
- Never automatically publish a clarification response, photo, changed concern, or changed pin.
- Keep clarification private and focused on the report; it is not a general messaging product.
- Preserve existing withdrawal, resident resolution confirmation/dispute, follow subscriptions, and archive history.
- Preserve English/Filipino, keyboard access, focus management, announcements, reduced motion, no link underlines, and the non-scrolling sign-in page.
- Do not delete less-used tools, introduce AI moderation, deploy, or modify production data as part of these tickets.

## Delivery

See [map.md](map.md). Ticket 01 is independent. Deliver 02, then 03 and 04 against the clarified state contract. Read installed Next.js documentation before framework changes. Use meaningful domain/API/persistence and browser checks appropriate to each slice; record actual results and remaining limits in the ticket.
