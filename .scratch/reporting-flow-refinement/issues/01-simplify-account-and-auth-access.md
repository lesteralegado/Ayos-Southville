# 01: Simplify account and authentication access

Status: resolved

Blocked by: none

Specification: [../spec.md](../spec.md)

## Problem and scope

Merge QA-05, QA-06, and QA-07 from [the QA audit](../../qa-audit-2026-11-13/report.md): completed consent repeats the entire disclosure, Account duplicates the shared language control, and authentication switch links have shallow touch targets.

Relevant files: `src/features/auth/resident-panel.tsx`, `src/features/pilot/consent-panel.tsx`, `src/features/auth/auth-panel.tsx`, shared navigation, localized copy, and scoped styles in `src/app/globals.css`.

## Acceptance criteria

- A validated current-version consent receipt shows Participation confirmed with details collapsed by default. The full disclosure and receipt remain accessible by keyboard in a clearly named expander.
- First-time, declined, outdated, unavailable, and unconfirmed consent states retain the full decision information and existing safeguards. Registration never implies consent. Do not display confirmation before the API establishes it.
- Account keeps privacy/data controls and sign-out outside the long disclosure. Existing role-specific and advanced tools remain reachable.
- The assembled Account page has one language control; intentionally standalone rendering retains a working locale control if needed.
- Expand authentication switch links toward a comfortable 44px touch target without breaking the existing non-scrolling sign-in requirement.
- Preserve the user's no-underline link styling, hover feedback, keyboard focus, English/Filipino, and wrapping of long aliases and receipt values.

## Verification

Exercise consent receipt, first decision, decline/reconsider, version conflict, loading, permission denial, and retry at the component/API boundary. Check assembled Account in both languages at desktop and narrow phone widths, keyboard disclosure behavior, long identifiers, and sign-out reachability. Run the existing seven-viewport/two-language sign-in check and consent browser flow. Verify the final interface with the applicable Impeccable workflow.

## Comments

Do not hide consent errors in a collapsed confirmed state or change participation eligibility to shorten the page.

## Answer

Implemented a current-server-confirmed participation heading with a collapsed native disclosure for the complete explanation and private receipt. First decisions and failed/unconfirmed refreshes keep the disclosure expanded; stale receipts cannot keep a confirmed claim or Continue to report link visible. Consent eligibility and server validation are unchanged.

Account uses the shared language switch with an explicit standalone fallback. Privacy controls, role-specific links, advanced tools and sign-out remain available; sign-out now precedes the participation section. Account-specific heading sizing keeps long aliases readable without taking over the page. Authentication switch links have a minimum 44px target while preserving the non-scrolling sign-in layout and no-underline styling.

### Verification

- Eight resident-panel component tests cover compact disclosure, keyboard/native expansion, account controls, shared/standalone locale switching, outdated/invalid receipts, refresh failure, decline, and lost-acknowledgement recovery.
- TypeScript and zero-warning repository lint pass.
- Sign-in browser check passes all seven viewport sizes in English and Filipino, with minimum 44px switch targets and no page scrolling.
- Consent browser check passes initial choice, validation, decline, permission denial, lost acknowledgement/reload, shared-header confirmed/expanded states, long alias, English desktop and Filipino 320px, keyboard, forced colors, reduced motion, overflow and automated accessibility checks.
- Batched visual inspection led to the scoped greeting-size correction; the confirmation run passed. No design detector ignores were added.
- Full regression suite: all 350 tests in 80 files pass with `npm test -- --maxWorkers=2`. Initial default-concurrency run had 349 passes and one unrelated local-startup timeout; the two startup tests passed immediately in isolation. The bounded-worker full rerun passed without changing unrelated tests.

### Standards

Independent standards review against baseline `b278d8e`: no documented-standard violations or actionable smell findings. Existing unrelated browser-script formatting changes are excluded from the commit.

### Spec

Independent specification review: no missing requirements, incorrect implementations, or scope additions found in ticket 01.

Review totals: Standards 0 findings; Spec 0 findings. Browser verification uses synthetic local fixtures, not Vercel, real-device or human screen-reader evidence.
