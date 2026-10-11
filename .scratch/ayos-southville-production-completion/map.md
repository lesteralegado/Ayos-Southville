# Production completion

Status: approved

Target: controlled Southville 1 pilot for 10-25 invited residents.

See [spec.md](spec.md) for scope and release gates.

| Ticket                                                                 | Blocked by     | Status          |
| ---------------------------------------------------------------------- | -------------- | --------------- |
| [01 Administration and access](issues/01-administration-and-access.md) | None           | resolved        |
| [02 Real report intake](issues/02-real-report-intake.md)               | 01             | resolved        |
| [03 Operator lifecycle](issues/03-operator-lifecycle.md)               | 02             | resolved        |
| [04 Resident communication](issues/04-resident-communication.md)       | 03             | resolved        |
| [05 Live discovery](issues/05-live-discovery.md)                       | 03             | resolved        |
| [06 Pilot hardening](issues/06-pilot-hardening.md)                     | 01, 02, 04, 05 | resolved |
| [07 Verify and release](issues/07-verify-and-release.md)               | 06             | ready-for-agent |

Tickets 01 through 06 are implemented and locally verified; ticket 07 is the release-verification frontier. Private Storage provisioning/configuration, revised Firebase rules, verified Resend sender and server credentials, authenticated worker scheduling, audit/retention secrets, independently pinned cleanup targets, accepted operational ownership, isolated managed restore rehearsal, tile-provider/CSP checks, and deployed two-account verification remain required before launch. See docs/release/pilot-operations.md; destructive cleanup remains disabled until its explicit gates are completed. Update this map when claiming or resolving tickets. Preserve the original eight tickets; this plan does not close their release gate.
