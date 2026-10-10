# Production completion

Status: approved

Target: controlled Southville 1 pilot for 10-25 invited residents.

See [spec.md](spec.md) for scope and release gates.

| Ticket                                                                 | Blocked by     | Status          |
| ---------------------------------------------------------------------- | -------------- | --------------- |
| [01 Administration and access](issues/01-administration-and-access.md) | None           | resolved        |
| [02 Real report intake](issues/02-real-report-intake.md)               | 01             | resolved        |
| [03 Operator lifecycle](issues/03-operator-lifecycle.md)               | 02             | ready-for-agent |
| [04 Resident communication](issues/04-resident-communication.md)       | 03             | ready-for-agent |
| [05 Live discovery](issues/05-live-discovery.md)                       | 03             | ready-for-agent |
| [06 Pilot hardening](issues/06-pilot-hardening.md)                     | 01, 02, 04, 05 | ready-for-agent |
| [07 Verify and release](issues/07-verify-and-release.md)               | 06             | ready-for-agent |

Tickets 01 and 02 are implemented and locally verified; ticket 03 is now the starting frontier. Ticket 02 still requires private Storage provisioning/configuration and deployed two-account verification before launch. After 03, tickets 04 and 05 are independent. Update this map when claiming or resolving tickets. Preserve the original eight tickets; this plan does not close their release gate.
