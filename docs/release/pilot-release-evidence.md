# Pilot release evidence

This document is the release gate for Ayos Southville. Demo records are synthetic and must never be reported as participant findings.

Start with [current recorded readiness](readiness-status.md) for dated local results and the remaining human, deployed and operational evidence. This release record remains incomplete; local verification is not accountable release approval.

## Deployment and complete journey

1. Configure Firebase Auth, Firestore, authorized domains, and server credentials from `.env.example`.
2. Deploy Firestore rules, run `npm run build`, then deploy the Next.js application.
3. For a demonstration environment only, set `NEXT_PUBLIC_DEMO_MODE=true`, `DEMO_MODE=true`, and a temporary `DEMO_SEED_PASSWORD` of at least 12 characters, then run `npm run seed:demo`. Never run the seed against a real pilot project.
4. Verify the deployed journey: verified resident submits a non-emergency report → authorized operator reviews the prepared draft and selects Approve and publish → authorized operator selects Start work, then Mark resolved with evidence → original reporter selects Confirmed fixed or Still a problem → public/resident timeline and notifications update. Operator messages need one language; translation is optional. Deploy required composite indexes and confirm READY first.
5. Capture deployment URL, build SHA, date, tester, and outcome below before release.

| Build / environment | Tester / date | Resident → operator → resident result |
|---|---|---|
| Pending deployment | Pending | Not yet claimed |

## Accessibility and responsive manual protocol

Axe-core WCAG A/AA regression checks run against the release page, report composer, report status/timeline/evidence view, and notifications, and the representative-volume module test covers 100 reports with 25 media records under the 100 ms interaction target. Automated tests supplement, and do not replace, these checks. Complete on the deployed build at 320 px phone, 768 px tablet, and 1440 px desktop.

- Keyboard: skip through every primary action, form, error link, view switch, notification preference, moderation action, and resolution response; verify visible focus and no traps.
- Screen reader: verify landmarks/headings, control names, form help/errors, error-summary links, live pending/failure messages, status text, timeline order, and the list alternative to maps in English and Filipino.
- Low vision: verify 200% and 400% zoom without two-dimensional scrolling for primary journeys; test Windows High Contrast/forced colors.
- Motion: with reduced motion enabled, verify non-essential transforms and transitions are suppressed.
- Recovery: interrupt report submission and photo preparation; verify draft, retry, pending, and authoritative confirmation states.
- Record browser, assistive technology, viewport, result, and every blocker. A release is blocked until all critical/serious findings are fixed and rerun.

| Check | Tool / viewport | Result | Evidence or issue |
|---|---|---|---|
| Automated semantics | axe-core / jsdom | Pass | Critical missing evidence-input label found, fixed, and rerun |
| Keyboard | Pending | Pending | Manual execution required |
| Screen reader | Pending | Pending | NVDA + Firefox/Chrome recommended |
| Zoom / contrast | Pending | Pending | Manual execution required |
| Reduced motion | CSS media-query review | Pass | Global transitions/animations reduced |
| Phone / tablet / desktop | Build-time CSS review | Partial | Manual deployed-device pass required |

## Performance and resilience targets

Use 100 public reports, 25 restricted/public media records, and a throttled Fast 3G profile.

- Public landing/list and report detail: useful content ≤ 2.5 s at p75 on a representative mid-range phone.
- Filter/view interactions: visible response ≤ 100 ms for 100 reports.
- Image preparation: immediate pending announcement; each accepted image compressed before upload; no more than five.
- Server-rendered pages should perform one application-boundary read per resource; avoid client fetch-on-mount waterfalls.
- Failed submissions retain drafts and idempotency keys; notification/email failure must not roll back lifecycle changes.

Record Lighthouse/Web Vitals and network waterfall artifacts here after deployment. Current production build passes; field performance is not yet claimed.

## Privacy and authorization review

Verified in application boundaries and Firestore rules:

- Public reads use `publicReports`; they omit reporter identity/contact, exact coordinates/private location, internal notes, and restricted media.
- Resident reads require a verified session and are scoped to the reporter.
- Moderation, assignment, lifecycle, role, and configuration actions require explicit roles and server confirmation.
- Removing the final administrator is transactionally rejected; privileged mutations and audit events commit atomically.
- Emergency guidance requires bilingual text, contact data, and an HTTPS source.
- Public insights aggregate `publicReports`, threshold recurring areas, and expose no staff ranking.

Before production launch, review Firebase IAM/service-account scope, storage rules and signed-media URLs, log retention, backup/restore, and deletion/retention policy with the pilot owner.

## Pilot measurement

Use pseudonymous participant codes only. Recruit at least 10 consenting residents. Record submission success, whether help was required, status comprehension, duplicate discovery, and completion of the administrator-to-resident lifecycle. The target is at least 80% unassisted submission. Do not record names, email addresses, exact homes, or free-text observations in the aggregate measurement record.
