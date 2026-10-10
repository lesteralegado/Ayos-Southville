# 06: Process reports through verified resolution

**What to build:** Let coordinators move an accepted concern through a transparent, auditable resolution process and let the original resident confirm that the outcome worked or return it for review.

**Blocked by:** 05: Moderate and organize incoming reports.

**Status:** resolved

- [x] Reports support Submitted, Under review, Assigned, In progress, Resolved, and Resident confirmed states.
- [x] Rejected and Duplicate remain explained terminal side outcomes.
- [x] Only valid status transitions are accepted, including through direct service requests.
- [x] Meaningful transitions require and publish a bilingual resident-readable update.
- [x] Coordinators can attach protected resolution evidence before marking a report Resolved.
- [x] Each transition produces the correct public timeline, audit event, and in-app notifications.
- [x] Residents can opt into email notifications, and delivery failure never rolls back the report transition.
- [x] The original reporter can confirm resolution or dispute it with a reason.
- [x] A disputed resolution returns to Under review without deleting its prior history or evidence.
- [x] End-to-end tests cover submission through administrative processing to resident confirmation and dispute.

## Answer

Implemented the complete report lifecycle with validated coordinator transitions, bilingual public updates, protected resolution evidence, public timeline events, audits, in-app and opt-in email notification requests, resident confirmation and dispute, and preserved history/evidence on re-review. Added production API, Firebase, status-label, timeline, and resident-response integration with end-to-end boundary coverage.
