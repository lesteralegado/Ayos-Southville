# 03: Present three-step resident progress

Status: resolved

Blocked by: 02

Specification: [../spec.md](../spec.md)

## Problem and scope

`reportStatusLabel` exposes Under review and Confirmed fixed as separate prominent labels. Residents want a simpler primary sequence while retaining meaningful explanations and truthful history. Build on ticket 02's private clarification state.

Relevant files: `report-presentation.ts`, resident report list/detail, report detail/timeline, resolution response, review expectations, and localized copy. Keep operator filters and persisted status semantics intact.

## Acceptance criteria

- Present Submitted, In progress, Resolved as the primary resident progress steps. A private submission and a published report still awaiting work share the first step but clearly differ through Awaiting review / Published supporting text.
- Existing Assigned records continue to present as In progress without migration.
- A reported resolution shows Resolved with Awaiting your confirmation and the existing Confirmed fixed / Still a problem choices. Confirmed reports retain confirmation as supporting information.
- A disputed resolution returns to the truthful current review state and visibly retains the resident's continued concern. Do not leave it visually completed or silently erase the previous resolution.
- Clarification, declined/duplicate outcomes with reasons, Archive requested, and Archived are explicit contextual states; never imply rejected or archived reports are progressing toward repair.
- Keep clarification questions and original private details absent from public views. Public displays may simplify progress but must not expose private waiting reasons.
- Historical timelines retain actual events and dates. No destructive migration, new repair guarantee, or removal of resident confirmation/dispute is permitted.
- Preserve exact map pins, primary operator actions, pagination, report counts, ownership enforcement, accessible text labels, and bilingual copy.

## Verification

Use a status/context matrix covering every existing status plus clarification pending/answered, disputed, archive-requested and archived reports. Check resident/public differences, legacy Assigned records, timelines, mobile layouts, and keyboard access to the current action. Reuse existing presentation, resident detail and resolution tests instead of rebuilding unrelated lifecycle logic.

## Comments

This updates the earlier simplification specification's presentation. Under review and Resident confirmed remain meaningful domain/history states, consistent with the glossary's independent-pilot boundaries.

## Answer

Resident list and detail now use Submitted, In progress and Resolved as the primary progress sequence. Published reports awaiting work stay at Submitted with Published supporting text; private submissions show Awaiting review. Legacy Assigned records appear as In progress. Resolved reports retain Awaiting your confirmation and both existing confirmation/dispute actions; confirmed reports show Confirmed fixed as supporting information.

A disputed resolution returns to the first step with Still a problem / Under review context, including after a same-state review handoff. Actual resolution, confirmation, assignment and review events retain their historical labels and dates. Declined, duplicate and archived reports do not display the repair progression. Clarification and archive-request context appear only at the owner boundary. Owners can read duplicate decision reasons on their private receipt and open the related report; nonowners retain the public canonical redirect. Review targets appear on submitted reports instead of misleadingly recurring on closed outcomes. Public discovery uses simplified card labels and public-only supporting context while preserving existing filter semantics.

No persisted statuses, coordinates, transactions, counts or pagination contracts were migrated. Existing operator filters and primary lifecycle actions remain intact.

### Verification

- All 373 tests in 84 files pass (`npm test -- --maxWorkers=2`). The first full run caught the new dispute/handoff regression while review was underway; its focused test and the final full run pass after the fix.
- TypeScript and repository lint pass.
- Presentation matrix covers every status, owner/public differences, pending/answered clarification, disputed and confirmed resolution, archive requested, archived and terminal reasons.
- Owner receipt persistence and page tests cover duplicate reasons, cross-owner denial and canonical redirect behavior. Existing resolution conflict/retry tests pass.
- New browser check passes English desktop and Filipino mobile, all lifecycle states, precise original pin fixture, keyboard dispute action, retained resolution dates, private context exclusion, terminal outcomes, responsive overflow and axe checks for resolved/disputed/archived states.
- Existing paginated report browser check passes bounded pages, retry without lost rows, older selected details, canonical merge, resident counts, EN/FIL, keyboard and axe.
- Existing discovery browser check passes filters, shared URLs, back/reload, pagination, real MapLibre/list equivalence, private-field exclusion, approved evidence, responsive axe, reduced motion, keyboard and text zoom.
- Batched desktop/mobile visual inspection led to a vertical mobile step list; one confirmation pass completed. No design detector ignores added.

### Standards

Independent standards review against baseline `155775a`: zero actionable findings.

### Spec

Independent spec review found one continued-concern reminder hidden by later review coordination. Fixed and regression-tested; reviewer confirmed zero remaining actionable findings. Browser checks use synthetic local fixtures, not production or human screen-reader evidence.