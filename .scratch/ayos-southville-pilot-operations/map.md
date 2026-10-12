# Controlled-pilot operating readiness

Status: approved breakdown

Six-ticket breakdown approved by the owner on 2026-10-12 (Asia/Manila). Scope is the confirmed four-week controlled pilot, starting with 10 consenting adults and expanding toward 25 only after coverage/safety review. This is planning approval, not release approval.

| Ticket | Blocked by | Status | Execution |
| --- | --- | --- | --- |
| [01 Coverage and pause controls](issues/01-coverage-and-pause-controls.md) | None | resolved | Local implementation verified; both code-review axes clear; release gates remain open |
| [02 Consented pilot participation](issues/02-consented-participation.md) | None | claimed | Implementation and local verification in progress |
| [03 Accountable report handling](issues/03-accountable-report-handling.md) | 01 | ready-for-agent | Implementation |
| [04 Truthful pilot measurement](issues/04-truthful-pilot-measurement.md) | None | ready-for-agent | Implementation |
| [05 Verify operational release readiness](issues/05-verify-operational-release.md) | 01, 02, 03, 04 | ready-for-agent | Agent-assisted; human/provider gates |
| [06 Run and evaluate the controlled pilot](issues/06-run-and-evaluate-pilot.md) | 05 + explicit release approval | ready-for-agent | Human-led; real four-week observations |

## Starting frontier

Tickets 01, 02 and 04 can start independently. Ticket 03 waits for recorded coverage/pause controls, not for unrelated measurement work. Ticket 05 verifies the integrated operating journey; Ticket 06 cannot begin recruitment until approval is evidenced.

Use [spec.md](spec.md) for the approved scope and test boundaries. Each UI slice retains Impeccable requirements and a bounded visual-inspection budget. All blockers must finish before a dependent ticket is claimed; ready-for-agent does not override human/provider prerequisites or authorize external writes.

The existing production-completion Ticket 07 remains unresolved. Reuse its release evidence rather than invent a competing approval record; preserve historical tickets and do not close the parent effort merely because these tickets were published. Code delivery and actual pilot results are separate milestones.
