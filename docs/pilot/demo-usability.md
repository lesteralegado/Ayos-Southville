# Local demonstration usability session

Scope agreed on 2026-10-15 (Asia/Manila). Three adults unfamiliar with the application use synthetic scenarios on their own phones. This is demonstration usability testing, not the controlled resident trial. No results have been collected yet.

## Prepare

Run `npm run local:check`, then follow `local-emulators.md` to start isolated emulators, seed synthetic accounts and start the app. Install the pinned browser with `npx playwright install chromium`. Run `node scripts/verify-local-demo.mjs` for connected local persistence checks; it creates clearly labelled test records, accepts synthetic account consent and stores generated test images only. It does not send email or approve release.

The agreed devices are a mix of Android phones and iPhones. The app is intentionally bound to loopback: a phone cannot open the computer's `127.0.0.1` address. Actual own-phone testing remains pending until a reviewed access method works on both platforms. Desktop device emulation is supplementary rehearsal and does not satisfy the own-phone requirement. Keep the emulator admin services on loopback.

`npm run verify:demo` runs all ten synthetic browser suites. `npm run verify:local-demo` exercises the actual running Next application with local Auth, Firestore and Storage. Both leave human usability results pending.

## Facilitate

Explain only: this is an independent resident-led demonstration using invented concerns. No real identities, household locations, contacts, personal photos or repair claims. Ask permission to observe and record anonymous usability notes. Participants may stop at any time.

Offer English or Filipino before starting. Avoid explaining the controls. Record the first attempt before helping. Use participant codes D1-D3, never names or emails.

1. Submit a fictional broken streetlight beside the covered court using a generated test image. Ask the participant to find the reference and explain what happens next.
2. Interrupt connectivity during a draft or request. Ask the participant to recover, retry and check whether the concern was submitted once.
3. Have the facilitator use the synthetic operator account to review, assign and progress the same report. Ask the participant to find and explain the update.
4. Mark a clearly labelled synthetic resolution with generated evidence. Ask the participant to dispute it; process a second synthetic resolution and ask them to confirm it.
5. Ask the participant which information is public and whether a repair is guaranteed. Inspect the public view from a signed-out session.

## Record

| Participant | Date / device / browser | Language | Task | Completed without help? | Hesitation or assistance | Status/privacy understanding | Defect / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| D2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| D3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

Capture outcomes for each task, including failures. A demonstration passes only after completion and comprehension blockers are fixed and retested. A passed automated suite does not fill in these rows. Keep synthetic exercises separate from real participant findings and pilot statistics.
