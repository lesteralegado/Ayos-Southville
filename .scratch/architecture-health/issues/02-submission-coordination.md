# 02: Extract submission and recovery coordination

**Parent:** ../spec.md

**What to build:** Preserve the resident reporting journey through a small explicit submission workflow interface.

**Blocked by:** 01: Automate clean repository verification.

**Status:** claimed

- [x] Use approved submission module and browser/HTTP seams, driving behavior changes test-first.
- [x] Preserve existing drafts, resident scoping, photos, validation, emergency diversion, duplicate suggestions and availability handling.
- [x] Represent pending, ambiguous, refused and confirmed outcomes explicitly; retry and receipt recovery retain idempotency identity.
- [x] Clear relevant local data only after authoritative confirmation or explicit discard.
- [x] Integrate with existing UI and HTTP contracts; preserve accessible English/Filipino states and verify affected browser journeys.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.

## Comments

2026-11-11: Extracted the submission workflow into a client module owning resident-scoped draft persistence/resume/discard, validation, photos, duplicate suggestions/support, availability refresh, submission and receipt recovery. The presentation retains its markup and bilingual copy, observes explicit editing/pending/ambiguous/refused/confirmed phases, and owns focus/navigation effects. Immediate operation locking prevents same-render repeated sends or pending draft edits. Successful receipt responses require a valid report reference before local cleanup. Discard cleans the saved draft's photo identity rather than a newly generated blank identity.

Red-to-green evidence: the first workflow test failed before the module existed; a malformed successful receipt test then exposed premature draft deletion, and a same-render pending-edit test exposed draft mutation. Both regressions passed after minimal fixes. Six workflow cases cover retired-category receipt recovery, malformed receipts, pending immutability, lost-response recovery with confirmed photos, device-storage failure, and retaining pending state until a pause explanation is confirmed. The pause-transition regression also failed before the corrected transition. Initial composer/accessibility/workflow coverage passed 16 tests; the final workflow/composer run passed 14 tests, including all six module cases.

The intake synthetic browser journey passed photo preparation/storage, lost-response upload recovery, preview/removal, English/Filipino, MapLibre with controlled tiles, duplicate choice and landmark-only receipt. Desktop/tablet/mobile axe, overflow, keyboard, reduced motion and 200% text zoom checks passed. Desktop and Filipino mobile captures were inspected together; incumbent layout preserved. The mechanical design detector reported no findings. No new human device, screen-reader or deployed evidence is claimed. Standard production build must pass in the integration root because isolated worktrees share dependencies through a junction rejected by Turbopack's hermetic root.

After merging the persistence ticket, an unconstrained full run passed 264 tests but hit two five-second interaction timeouts in consent refresh and in-flight pause. Both files passed all 11 tests when run in isolation; the consent test was left unchanged. The pause test now pastes its setup prose instead of synthesizing irrelevant individual keystrokes. The full suite passed 65 files / 266 tests with two workers. The subsequently added pause-transition test and final workflow/composer cases passed separately (14 tests); no global timeout or worker configuration was changed. Final TypeScript and zero-warning lint checks passed. Ticket remains claimed solely pending the integration-root standard production build.
