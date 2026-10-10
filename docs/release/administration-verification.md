# Ticket 01 verification — 2026-10-10

## Delivered behavior

Administration is available at /administration after verified administrator sign-in. Account navigation exposes the workspace by role. Administrators can invite email addresses, approve/revoke resident participation, update roles, configure routing and bilingual emergency guidance, and inspect the latest 100 audit events. The page shows the count of verified, non-disabled administrators and warns below two.

Invitations approve participation; they do not send email. Share the registration link personally. An explicit profile approval is independent of an invitation. To stop an already explicitly approved participant, revoke that person's access. Explicit access revocation overrides invitations and legacy operator participation. Resident participation and operator capabilities are distinct; revoke roles separately to remove operator authority.

## Migration and deployment

- Existing resident profile roles and aliases are preserved. Missing access on an existing operator permits participation; missing access on an ordinary resident requires an active verified-email invitation.
- Access/role changes modify only their requested field and create audit events atomically. Firebase last-administrator checks occur inside the transaction and require another verified, non-disabled Auth account.
- Missing configuration retains the three deployed pilot category defaults. Configuration changes validate identifiers, active routing, bilingual labels, and HTTPS emergency sources.
- Invitations use normalized emails with hashed document identifiers. Firestore client rules already deny writes to privileged fields and invitation/configuration/audit collections.
- Storage is denied by default through storage.rules and firebase.json. Deploy Storage rules when provisioning the bucket in ticket 02; no production rule deployment was performed here. There is no upload endpoint yet. Direct evidence attachments are participation-gated now; actual file upload is ticket 02.
- Push the implementation commit for Vercel deployment, then verify the existing administrator account can open the workspace. Approve existing ordinary residents intentionally before they submit again.

## Recorded checks

- Full Vitest suite: 22 files, 75 tests passed.
- TypeScript: passed. Production Next.js build: passed.
- ESLint on changed application files and verification script: passed with no findings.
- Direct API tests: resident denial of private administration and writes; cross-origin denial; malformed roles/configuration/numeric identifiers/emergency sources; last-administrator protection; audited invitations; denied unapproved report submission and supporting-evidence attachment.
- Application tests: invitation approval/revocation, explicit approval/revocation, unverified/missing profile denial, legacy role preservation, and configuration defaults.
- UI tests: invitation refresh from authoritative response, preservation of a configuration draft across unrelated saves, and recoverable connection failure without false success.
- Playwright verification: invitation, access approval, role grant, configuration save, administrator count, English/Filipino rendering, keyboard focus, no horizontal overflow at desktop 1440x1000, tablet 768x1024, phone 390x844; zero axe WCAG A/AA violations at those sizes.
- Bounded visual review: inspected desktop and Filipino phone screenshots, with one final confirmation after fixes.
- Built-app smoke: /api/administration returns 401 without a session; /reports/new redirects to sign-in; /administration uses a Next.js streamed sign-in redirect (HTTP 200) without private workspace content.
- Standards review: no documented violations or remaining blocking findings. Draft loss, audit-string mutation coupling, and duplicated role parsing were addressed.
- Spec review: identifier/source type-validation gaps were addressed. No scope creep identified.

Run npm run verify:administration for repeatable synthetic browser verification. It uses an in-memory application store and an intercepted fetch boundary; it is UI/domain evidence, not proof of authenticated Next-to-Firebase persistence. Screenshots are stored locally in the ignored completion artifacts directory. The script uses installed Playwright Chromium or PLAYWRIGHT_CHROMIUM_EXECUTABLE; install a compatible browser when neither is available.

## Remaining release gates

Authenticated deployed browser-to-API-to-Firebase checks, concurrent transaction verification against the deployed database, actual screen-reader operation, full keyboard task completion, browser zoom, reduced-motion manual checks, and real-device testing remain ticket 07 gates. No production writes, user invitations, or Firebase rules deployment were made during verification.

Two verified administrators are still required before pilot invitations are sent. Actual evidence storage, operational moderation, notifications, and live discovery belong to subsequent tickets.

Production dependency audit still reports eight existing moderate transitive findings and zero high/critical findings. Resolving them requires separate Firebase runtime compatibility work; no forced major upgrade was applied.
