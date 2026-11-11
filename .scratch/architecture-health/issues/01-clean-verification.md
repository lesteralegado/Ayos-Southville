# 01: Automate clean repository verification

**Parent:** ../spec.md

**What to build:** Make every pull request and default-branch change run reproducible tests, TypeScript, lint and a production build with actionable output.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

+- [ ] Reuse package commands and committed lockfile; run without production credentials or deployment.
- [ ] Exclude bundled external skill tooling from application lint without hiding application warnings.
- [ ] Fix React asynchronous test warnings and address canvas accessibility limitations honestly; retain meaningful coverage.
- [ ] Verify commands locally and workflow failure propagation without changing branch protection.
- [ ] Record focused and full verification results; preserve unrelated staged work.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.
