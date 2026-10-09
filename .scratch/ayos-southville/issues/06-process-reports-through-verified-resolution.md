# 06: Process reports through verified resolution

**What to build:** Let coordinators move an accepted concern through a transparent, auditable resolution process and let the original resident confirm that the outcome worked or return it for review.

**Blocked by:** 05: Moderate and organize incoming reports.

**Status:** ready-for-agent

- [ ] Reports support Submitted, Under review, Assigned, In progress, Resolved, and Resident confirmed states.
- [ ] Rejected and Duplicate remain explained terminal side outcomes.
- [ ] Only valid status transitions are accepted, including through direct service requests.
- [ ] Meaningful transitions require and publish a bilingual resident-readable update.
- [ ] Coordinators can attach protected resolution evidence before marking a report Resolved.
- [ ] Each transition produces the correct public timeline, audit event, and in-app notifications.
- [ ] Residents can opt into email notifications, and delivery failure never rolls back the report transition.
- [ ] The original reporter can confirm resolution or dispute it with a reason.
- [ ] A disputed resolution returns to Under review without deleting its prior history or evidence.
- [ ] End-to-end tests cover submission through administrative processing to resident confirmation and dispute.
