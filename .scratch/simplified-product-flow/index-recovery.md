# Firestore index recovery

2026-11-13 (Asia/Manila): the live `ayos-southville` database had only the two declared `privateReports` indexes. The operator-owned queue therefore failed with Firestore code 9 for `moderationReports(reviewOwnerUid, status, submittedAt DESC, __name__ DESC)`. This is a deployment prerequisite failure rather than invalid report data.

Ran the scoped index deployment using the existing `firestore.indexes.json`. Firebase successfully created the two ownership indexes and the chronological resident-notification index; the existing private-report indexes were retained. No application deployment, rules publication, document changes, participant invitations or email sends were performed. Subsequent status verification showed the three new indexes still CREATING; Firebase must finish building them before their queries can run.

Both resident and operator report pages now recognize only the missing/building-index failure and present a bilingual preparation message with a Retry link. They do not pretend that the list is empty. Unrelated permission and storage errors continue through normal error handling.

Four page-level regression tests pass, covering both routes, missing/building indexes, and unrelated errors. Typecheck and targeted lint pass.
