# Ayos Southville QA audit — 13 November 2026

Status: completed

Implementation integrity: **pass for the inspected flows**. The interface consistently uses the community reporting model, restrained green/paper palette, bilingual actions, private submission review and explicit publication. The configured Impeccable source detector returned no findings. No detector ignores were added. This is a bounded QA assessment, not a claim that every possible defect has been eliminated.

## Results

| Check | Result |
| --- | --- |
| Full regression suite | 345 tests, 80 files passed after fixes |
| Real Firebase SDK contracts | 9 tests passed against isolated emulator databases |
| TypeScript | Passed |
| Repository lint | Passed with zero warnings |
| Production builds | Both webpack and default Turbopack passed in a credential-free source snapshot |
| Built-app smoke | Private redirects, unauthenticated workers, unavailable health without configuration, bilingual privacy hydration passed |
| Assembled app | 46 visits across anonymous, resident and administrator sessions; English/Filipino; 1440px/390px |
| Final assembled-app failures | 0 runtime errors, 0 horizontal overflows, 0 automated WCAG A/AA violations |
| Sign-in layout | Seven viewport sizes in both languages; no page scrolling; short-screen controls reachable |
| Intake | Photos, interrupted-upload recovery, draft resume, removal, duplicates, landmark-only submission, EN/FIL, keyboard, axe, responsive layout and text zoom passed |
| Operator | Publish/redact, assignment, start, protected resolution uploads, reject, merge, role denial, stale conflicts and connection recovery passed |
| Connected local journey | Auth/session, consent, Storage, idempotent submission, persisted lifecycle, dispute/confirmation, notifications and public privacy passed |
| Discovery | Filters, URLs, browser navigation, pagination, MapLibre/list agreement, private-field exclusion, empty/offline/retry states passed |
| Communication | Notifications/read state/preferences, reporter confirmation/dispute, private reasons, forbidden reporter and stale conflicts passed |
| Administration | Invitations, access, roles, configuration, bilingual/responsive/keyboard/axe checks passed |
| Participation | Consent/decline, adult choice, interrupted acknowledgement and receipt recovery passed |
| Coverage | Pause/resume, retained drafts, independent invitation pause, recovery confirmation, responsive/forced-color/axe checks passed |
| Review accountability | Backup takeover, lost acknowledgement recovery, one delay notice, private correspondence and review-calendar checks passed |
| Measurement | Edit/recovery, provenance, insufficient sample, trial start and reviewed expansion passed |
| Recent fixes | Archive retry/EN/FIL/mobile and exact resident-to-public pin location passed |
| Server compatibility | Firebase Admin imports and signing-key conversion with require(ESM) disabled passed |

Source snapshot: `.scratch/worktrees/qa-build-20261113`; no `.env.local` or cloud credentials copied. Build workspace-root warnings are caused by the nested test snapshot and its extra lockfile. The user's existing development server was left running.

## UI audit health

These are inspection scores, not certification or performance benchmarks.

| Dimension | Score | Evidence / limit |
| --- | --- | --- |
| Accessibility | 3/4 | Rendered axe checks, keyboard, contrast, forced colors and reduced motion pass; human assistive-technology testing remains outstanding |
| Performance | 3/4 | Production compilation and navigation work; no controlled mobile performance or network benchmark performed |
| Theming | 3/4 | Coherent light theme; several feature-specific literal colors remain alongside tokens; dark mode is not a requirement |
| Responsive design | 3/4 | Final live visits fit; account overflow fixed; small auth-switch targets remain a comfort issue |
| Implementation integrity | 4/4 | Coherent reporting workflow, tested privacy boundaries, configured source detector clean |
| Total | **16/20 — Good** | Address the focused UX recommendations below |

## Findings fixed

### QA-01 · P0 · Production build rejected API handler signatures

Locations: `src/app/api/moderation/route.ts`, `src/app/api/notifications/route.ts`, `src/app/api/reports/route.ts`, and `src/app/api/reports/[reference]/request/route.ts` (also re-exported by `/api/report-requests`).

Reproduction: a clean production build generated route validators rejecting `GET(request?: Request)` as incompatible with the required request parameter. Ordinary development type checking and the existing tests did not expose this.

Fix: require `Request`, remove unreachable absent-request fallbacks, and provide actual requests in direct route/journey tests. Both production builders and the built-app smoke check now pass.

### QA-02 · P2 · Filipino account page overflowed on mobile

Locations: `.message-page` and `.message-card` in `src/app/globals.css`.

Reproduction: authenticated resident, `/account`, Filipino, 390px viewport, synthetic alias `LocalResident`: document width exceeded viewport by 7px. Redirects to the same account page repeated the symptom.

Fix: constrain the grid track, allow the card to shrink and long text to wrap, and use responsive padding. Final 46-visit sweep reports zero overflow.

### QA-03 · P2 · Language control had an 18px-high target

Location: `.language-button` in `src/app/globals.css`.

Impact: the shared language action was unnecessarily hard to tap on a phone. This is a touch comfort finding; the measured visual height alone does not establish a WCAG target-spacing failure.

Fix: minimum 44px width and height. Final live measurements no longer flag this control as small. All 14 sign-in viewport/language combinations still pass.

### QA-04 · P2 · Browser checks no longer followed the simplified UI

Locations: `scripts/verify-intake-browser.mjs`, `scripts/verify-operator-browser.mjs`, `scripts/verify-coverage-browser.mjs`, `scripts/verify-accountable-review-browser.mjs`.

Impact: checks stopped at obsolete consent wording, approximate-pin labels, hidden advanced controls and an old recovery path. This blocked useful coverage without identifying an application failure.

Fix: target the stable consent field, use current pin labels, open the relevant disclosures, and recover through the visible Retry action. All four workflows now pass. A temporary concurrent fixture-port collision was a test scheduling issue; sign-in and coverage were rerun sequentially and passed.

Added `scripts/verify-app-qa.mjs` to exercise the assembled pages rather than only component fixtures. It records routes, redirects, rendered accessibility results, overflow, runtime errors and screenshots. A real SDK contract now verifies that the navbar report-count source includes 27 owned reports across pagination, excludes other owners, retains archived private history and decreases after deletion.

## Remaining UX recommendations

### QA-05 · P2 · Authentication switch links have shallow touch targets

Location: `.auth-switch` in `src/app/globals.css`; `src/features/auth/auth-panel.tsx`.

Evidence: the create-account/sign-in switch measures approximately 16px high in the rendered audit. Nearby spacing means this is not automatically a WCAG violation, but a larger target would be easier to use.

Recommendation: expand the clickable area while preserving the requested non-scrolling sign-in layout at 320×568. Validate the 14 sign-in combinations after changing it. Suggested flow: `$impeccable adapt`, then `$impeccable polish`.

### QA-06 · P2 · Account page repeats the full participation disclosure after consent

Location: `src/features/auth/resident-panel.tsx` renders `ConsentPanel`; `src/features/pilot/consent-panel.tsx`.

Evidence: the consented Filipino account screenshot is over 3,000px tall; the full disclosure precedes the existing receipt and sign-out action. It makes ordinary account use slower despite valid recorded consent.

Recommendation: retain the complete disclosure for first-time decisions; after confirmed consent, show the receipt/status prominently and offer a disclosure expander. Keep reload, deletion access and sign-out easy to find. Do not remove consent information or infer consent from registration. Suggested flow: `$impeccable distill`, then `$impeccable polish`.

### QA-07 · P3 · Account page duplicates the language switch

Location: `src/features/auth/resident-panel.tsx` and `src/features/navigation/product-navigation.tsx`.

Evidence: both the shared header and the account card show English/Filipino controls in the assembled screenshot.

Recommendation: use the shared header control in the full application while preserving intentional standalone component use. Suggested flow: `$impeccable distill`, then `$impeccable polish`.

Remaining counts: **0 P0, 0 P1, 2 P2, 1 P3**. Fixed counts: **1 P0, 3 P2**. No suppressions added. Other existing workspace changes were preserved.

## Evidence and reproduction

- Live-route results: `artifacts/live-route-audit.json`; screenshots in the same directory.
- Detector: `artifacts/design-detector.json`.
- Start emulators and synthetic accounts with `npm run local:emulators`, `npm run local:seed`, `npm run local:app`; then `node scripts/verify-app-qa.mjs`.
- Regression gates: `npm test`, `npm run test:persistence`, `npm run typecheck`, `npm run lint -- --max-warnings=0`.
- Browser workflows: the corresponding `scripts/verify-*-browser.mjs` files. Run fixtures sharing port 4189 sequentially.

## Coverage limits

Cloud Firebase indexes, actual Vercel configuration/deployment, production account data, real email delivery, real GPS hardware accuracy, physical-device touch, Safari/Firefox, human screen-reader use, external provider outages and load/security penetration testing were not exercised. Browser layout checks used Chromium emulation; fixture map checks used controlled tiles. Production smoke deliberately ran without credentials and verified refusal rather than live service readiness. User-confirmed link styling and the existing visual identity were retained.
