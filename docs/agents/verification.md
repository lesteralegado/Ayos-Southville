# Repository verification

Pull requests and pushes to the repository's default branch run the locked dependency install, unit/integration suite, TypeScript, application lint with zero warnings, and production build on Node.js 24. Each command is a separate required-success workflow step; a failed command fails the job and skips later steps. The workflow has read-only repository permissions and does not receive production credentials or deploy the application. Branch-protection enforcement is a separate repository setting and is not configured by this change.

Use `npm ci`, `npm test`, `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm run build` locally. The build can compile without Firebase credentials; runtime readiness must still refuse missing configuration. Do not add production credentials to make verification pass.

Application lint excludes bundled skill tooling and nested implementation worktrees. Tests and TypeScript also exclude nested worktrees to prevent duplicate discovery. Maintained application, configuration and verification scripts remain checked.

The jsdom accessibility sweeps check DOM semantics. They explicitly omit color contrast and label-content-name-mismatch: axe's label matching needs rendered font/canvas metrics that jsdom cannot provide. No fake canvas measurements or global warning suppression stand in for those checks. Accessibility sweeps run inside React `act` so pending application updates settle, and console errors fail those sweeps. Public-directory tests wait for observable loaded content before ending visits.

Run the intake and communication browser verification commands for real-browser contrast and label-in-name checks; their axe tag sets include WCAG 2.1 A. These exercise actual rendered UI with synthetic adapters, not production services. Browser axe results do not replace human screen-reader, zoom or own-device testing, nor do they establish deployed readiness. The pilot-page jsdom sweep alone does not establish its contrast or label-in-name coverage.
