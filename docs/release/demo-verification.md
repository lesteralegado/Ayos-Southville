is# Local demonstration verification

Date: 2026-10-15 (Asia/Manila). Automated local checks passed. Human own-phone usability remains pending. This is not deployed release approval.

## Implemented fixes

- Browser verification uses the pinned Playwright executable, separate Vite caches and watchers that ignore generated Next output and evidence captures.
- Same-origin validation handles Next dev's localhost URL rewriting only for the exact isolated local project, loopback Host and configured app origin. Hosted/production checks retain strict URL-origin equality.
- Owned private receipts load persisted moderation history, including legacy rejection reasons. Internal correspondence and actor IDs are omitted. Private receipt copy is accurate in English and Filipino.
- Operator header controls wrap at 200% text size on a 390px viewport. The earlier measurement was 403px document width; the strict no-overflow check now passes.

## Evidence

- Full unit/integration suite: 63 files, 258 tests passed.
- Production build: passed, including TypeScript and all 28 generated pages.
- `npm run verify:demo`: all ten synthetic browser suites passed: intake, operator, communication, discovery, administration, consent, coverage, accountable review, measurement and privacy hardening.
- `npm run verify:local-demo`: actual local Next application with Auth/session cookies, consent, protected photo Storage, duplicate-safe submission retry, stored operator lifecycle, resident browser dispute and confirmation, reload persistence, notifications, public privacy and English/Filipino private rejection receipts passed.
- Desktop/mobile private rejection and operator 200% text captures inspected. Browser device emulation is not human phone evidence.
- Java 21 installed. Auth, Firestore and Storage emulator startup and local synthetic seeding passed. No cloud billing was enabled.

Existing jsdom canvas and React act warnings remain in the unit accessibility suite. Real screen-reader use, slow-network device performance and production integrations have not been demonstrated by these checks.

## Run again

Follow `../pilot/local-emulators.md` to start the emulators and app. Install Playwright Chromium if needed with `npx playwright install chromium`. Run `npm run verify:demo` and, while the isolated app and emulators run, `npm run verify:local-demo`.

The connected smoke test creates synthetic local reports, photo evidence and consent for test accounts. It does not establish real consent, operator acceptance, repairs, trial approval or recruitment authority. The emulator data is disposable when those services stop.

## Remaining acceptance work

The three usability testers will use a mix of Android phones and iPhones. A phone cannot access the computer's loopback address directly. A reviewed access method for both platforms and the actual three-person sessions are pending. Desktop emulation does not substitute for that requirement. See `../pilot/demo-usability.md` for the tasks and anonymous evidence table.

The controlled resident trial remains a later milestone with its existing deployed release gates unresolved.
