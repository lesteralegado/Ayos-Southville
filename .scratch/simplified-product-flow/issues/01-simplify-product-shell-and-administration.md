# 01 — Simplify product shell and administration

Status: resolved

Blocked by: none

## Outcome

Make the reporting product unmistakably primary. Show only Community reports, Report a concern, My reports, Report operations, and Account in everyday navigation, and make routine administration about People and access, Invitations, and Report categories.

## Scope

- Map shared navigation, account entry points, administration sections, and role capabilities before editing.
- Implement role-aware navigation for visitors, residents, operators, and administrators on phone and desktop.
- Reorganize administration into an everyday view and clearly labelled Advanced settings/Advanced pilot tools.
- Keep `/pilot`, `/insights`, `/administration/measurement`, operating pauses, review calendar, audit history, privacy/retention operations, and configuration reachable only from appropriate advanced/account surfaces.
- Preserve every authorization and server-side validation boundary. Keep destructive and hard-to-reverse operations explicit, confirmed, and visually distinct.
- Preserve English/Filipino labels, current-page indication, focus behavior, independent-pilot disclosures, and truthful measurement boundaries.

## Verification

- Add navigation and administration-visibility tests for every role.
- Test deep-link authorization and prove every retained advanced control remains reachable to its authorized role.
- Verify keyboard navigation, screen-reader names, focus, zoom, reduced motion, and representative phone/desktop layouts.
- Run focused app/administration tests, typecheck, and lint for touched files.

## Completion criterion

Every role sees only its agreed everyday destinations; routine administrators see only the three primary responsibilities first; every preserved advanced capability remains discoverable and authorized; all focused checks pass.

## Implementation evidence

Implemented 2026-11-12 (Asia/Manila). Shared server-informed navigation supplies role visibility, current-page indication, the established brand mark, and one primary reporting action. Page-local home/account/language headers are suppressed when the shared shell is present; standalone component fixtures retain them.

Administration leads with people, invitations, and categories. Advanced settings preserves coverage, review calendar, minimized audit history, privacy operations, measurement, insights, and release evidence. Destination and emergency configuration use labelled disclosures in the existing configuration form. Account exposes public pilot tools under a disclosure; administrator access remains role-controlled.

- Focused navigation, administration, account, and public-page tests pass. Advanced route tests cover visitor, Resident, Moderator, and Coordinator denial plus Administrator access.
- Typecheck, lint, and production build pass.
- Final full suite: 68 files and 295 tests passed.
- Browser verification covers invitation/access/role/configuration changes, English/Filipino, desktop/tablet/mobile, keyboard focus, navigation visibility, overflow, and automated accessibility with synthetic data.
- Captures are under `../artifacts/`: `administration-desktop.png`, `administration-tablet.png`, `administration-mobile.png`, and `administration-mobile-filipino.png`.
- Independent Standards and Spec reviews cleared their findings after fixes.
- Visual finish review: `disposition: ship`; tablet/phone navigation issue resolved and confirmed in refreshed captures.

## Comments

Production deployment and human screen-reader/device verification remain separate from local automated evidence. Notification consolidation and lifecycle changes belong to subsequent tickets.

