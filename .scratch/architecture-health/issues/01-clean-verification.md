# 01: Automate clean repository verification

**Parent:** ../spec.md

**What to build:** Make every pull request and default-branch change run reproducible tests, TypeScript, lint and a production build with actionable output.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [x] Reuse package commands and committed lockfile; run without production credentials or deployment.
- [x] Exclude bundled external skill tooling from application lint without hiding application warnings.
- [x] Fix React asynchronous test warnings and address canvas accessibility limitations honestly; retain meaningful coverage.
- [ ] Verify commands locally and workflow failure propagation without changing branch protection.
- [ ] Record focused and full verification results; preserve unrelated staged work.

## Delivery

Follow the parent specification and owner-approved testing seams. Read project guidance and installed framework documentation before code changes. Preserve existing user changes. Record implementation commits and verification under Comments; mark resolved only when all criteria pass.

## Comments

2026-11-11: Added pull-request/default-branch verification using locked npm installation, existing commands, Node.js 24, read-only permissions and no production secrets. Each step propagates its exit status; no continue-on-error or deployment is present. Branch protection was not changed. Application lint ignores bundled skill tooling and nested worktrees; TypeScript/Vitest also exclude nested worktrees.

Observed red-to-green regression: a console-error assertion failed on the existing pilot-page asynchronous React warnings before the fix; focused accessibility/directory tests then passed (7 tests) without those warnings. Axe sweeps now await React updates. jsdom explicitly excludes contrast and label-content-name-mismatch because real font/canvas metrics are unavailable. Real-browser intake and communication sweeps now include WCAG 2.1 A and passed desktop/tablet/mobile axe, keyboard and recovery checks. No global console suppression or fake canvas measurements were added.

Full suite: 63 files / 258 tests passed. Type checking passed. Application lint with zero-warning threshold passed. Worktree production build failed before compilation because Turbopack's hermetic filesystem root cannot resolve the installed Next package through the shared node_modules junction. No dependencies or framework settings were altered to bypass that limit. The integrated root must run the standard production build before this ticket is resolved. Hosted workflow execution is not claimed by local verification.
