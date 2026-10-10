# 07: Administer and measure the pilot

**What to build:** Let administrators configure who can operate the pilot, what it accepts, where concerns are routed, which emergency guidance is shown, and which privacy-safe outcomes the community can see.

**Blocked by:** 06: Process reports through verified resolution.

**Status:** resolved

- [x] Administrators can grant and revoke Resident, Moderator, Coordinator, and Administrator capabilities safely.
- [x] The system prevents an administrator from accidentally leaving the pilot without a viable administrator.
- [x] Administrators can manage report categories and responsible destinations without application code changes.
- [x] Administrators can configure verified emergency guidance separately for English and Filipino.
- [x] Configuration changes are validated, authorized, and represented in the audit history.
- [x] The public can view report totals by category and status without accessing private records.
- [x] The public can view correctly defined median first-response and resolution times.
- [x] Recurring-area insights apply a privacy threshold and never identify a household.
- [x] The public can see resident-confirmed resolution totals without individual staff rankings.
- [x] Tests cover permissions, unsafe configuration attempts, timezone boundaries, empty datasets, median calculations, and privacy thresholds.

## Answer

Implemented administrator-controlled roles with last-administrator protection, audited category/routing and bilingual verified emergency configuration, configuration-driven submission validation, and privacy-safe public insights for category/status totals, response/resolution medians, thresholded recurring areas, and resident-confirmed outcomes. Added Firebase adapters, protected administration APIs, public insights API/page, and boundary tests for authorization, unsafe changes, empty data, medians, timezone crossings, and privacy thresholds.
