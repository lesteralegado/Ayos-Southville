# 03: Present three-step resident progress

Status: ready-for-agent

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
