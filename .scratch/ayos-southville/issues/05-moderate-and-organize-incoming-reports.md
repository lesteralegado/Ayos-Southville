# 05: Moderate and organize incoming reports

**What to build:** Give authorized pilot operators a safe queue for verifying incoming concerns, protecting residents, rejecting unsuitable content, merging duplicates, and organizing valid reports for action.

**Blocked by:** 04: Prevent duplicates and keep residents informed.

**Status:** ready-for-agent

- [ ] Moderator, Coordinator, and Administrator capabilities are enforced at the application boundary rather than only hidden in the interface.
- [ ] Moderators can review newly submitted reports and inspect private information only when authorized.
- [ ] Moderators can protect or redact sensitive text, locations, and media before public display.
- [ ] Moderators can reject spam, abusive, emergency, out-of-area, or out-of-scope reports with a resident-readable reason.
- [ ] Moderators can merge duplicates into a canonical report without losing affected residents, followers, evidence, or history.
- [ ] Residents following a merged report are directed to and notified about the canonical report.
- [ ] Coordinators can assign priority and a responsible destination to an accepted report.
- [ ] Every privileged mutation records actor, time, action, target, and relevant reason in an immutable audit history.
- [ ] Tests attempt forbidden actions directly and cover moderation, rejection, merge, assignment, and privacy outcomes.
