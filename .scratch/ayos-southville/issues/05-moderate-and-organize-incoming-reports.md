# 05: Moderate and organize incoming reports

**What to build:** Give authorized pilot operators a safe queue for verifying incoming concerns, protecting residents, rejecting unsuitable content, merging duplicates, and organizing valid reports for action.

**Blocked by:** 04: Prevent duplicates and keep residents informed.

**Status:** resolved

- [x] Moderator, Coordinator, and Administrator capabilities are enforced at the application boundary rather than only hidden in the interface.
- [x] Moderators can review newly submitted reports and inspect private information only when authorized.
- [x] Moderators can protect or redact sensitive text, locations, and media before public display.
- [x] Moderators can reject spam, abusive, emergency, out-of-area, or out-of-scope reports with a resident-readable reason.
- [x] Moderators can merge duplicates into a canonical report without losing affected residents, followers, evidence, or history.
- [x] Residents following a merged report are directed to and notified about the canonical report.
- [x] Coordinators can assign priority and a responsible destination to an accepted report.
- [x] Every privileged mutation records actor, time, action, target, and relevant reason in an immutable audit history.
- [x] Tests attempt forbidden actions directly and cover moderation, rejection, merge, assignment, and privacy outcomes.

## Answer

Implemented a role-enforced moderation application boundary for private queue review, privacy-safe acceptance and redaction, categorized rejection, duplicate merging with canonical redirects and resident notifications, coordinator assignment, and append-only privileged audit history. Verified with direct forbidden-action, privacy, moderation, rejection, merge, assignment, notification, and audit tests.
