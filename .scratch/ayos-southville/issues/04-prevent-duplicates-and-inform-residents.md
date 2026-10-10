# 04: Prevent duplicates and keep residents informed

**What to build:** Help residents find and support existing concerns instead of fragmenting them, then keep interested residents informed through follows, affected-resident signals, timelines, and in-app notifications.

**Blocked by:** 03: Add locations, maps, and photo evidence.

**Status:** resolved

- [x] Before final submission, residents see explainable possible matches based on category, proximity, recency, and unresolved status.
- [x] Residents can dismiss unrelated suggestions and submit a distinct report.
- [ ] A verified resident can mark “I’m affected too” once per canonical report and later withdraw that signal.
- [x] An affected resident can add protected supporting evidence under the established media rules.
- [x] Residents can follow and unfollow reports without claiming direct impact.
- [x] Submitted, affected, and followed reports generate appropriate in-app notifications for meaningful events.
- [x] Residents can view and mark notifications as read and control notification preferences.
- [x] Optimistic follow and affected actions reconcile cleanly when authoritative updates succeed or fail.
- [x] Tests cover duplicate suggestion boundaries, relationship uniqueness, privacy, and notification behavior.

## Answer

Implemented explainable duplicate suggestions, distinct submission, unique affected and follow relationships, protected supporting evidence, private in-app notifications, read state, preferences, and optimistic rollback. Verified with tests, typechecking, lint, production build, frontend detection, and two-axis review.
