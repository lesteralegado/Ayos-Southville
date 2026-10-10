# 08: Prepare the pilot and portfolio release

**What to build:** Turn the complete product into a credible Southville 1 pilot and portfolio release with verified accessibility, resilience, performance, privacy, deployment, measurement, and an honest case study.

**Blocked by:** 07: Administer and measure the pilot.

**Status:** claimed

- [ ] The complete resident-to-administrator-to-resident journey works in the deployed environment.
- [ ] A clearly labeled demonstration mode includes realistic seeded users, reports, statuses, evidence, and analytics.
- [ ] English and Filipino content is complete for all primary journeys, validation, states, notifications, and safety guidance.
- [ ] Phone, tablet, and desktop layouts support the intended public, resident, and administrative journeys.
- [ ] Manual keyboard and screen-reader checks complement automated accessibility checks, and discovered blockers are resolved.
- [ ] Focus, contrast, zoom, reduced motion, status announcements, map alternatives, and error recovery meet the specification’s accessibility intent.
- [ ] Representative report and media volumes meet documented interaction and loading targets without unnecessary request waterfalls.
- [ ] A privacy and authorization review verifies public contracts, exact locations, identities, media access, administrative actions, and audit history.
- [ ] Pilot measurement can record at least 10 participants, unassisted submission rate, status comprehension, duplicate discovery results, and lifecycle completion.
- [ ] The portfolio case study explains the real problem, architecture, privacy tradeoffs, testing evidence, pilot findings, limitations, and lack of official affiliation.

## Answer

Implemented the release package: an explicitly labeled demonstration mode, a guarded repeatable Firebase seed for 10 pseudonymous users and realistic lifecycle reports/evidence, an honest portfolio case-study page, privacy-minimized pilot measurement with an administrator-only API, global focus/forced-colors/reduced-motion safeguards, and deployment/accessibility/performance/privacy runbooks.

Automated implementation is complete. Resolution remains gated on two external checks that cannot be truthfully claimed from the repository alone: executing the complete journey on the final deployed URL, and recording human keyboard, screen-reader, zoom, contrast, and representative-device results in `docs/release/pilot-release-evidence.md`. Real pilot findings also remain intentionally unclaimed until at least 10 consented residents participate.