# Report archiving

Status: implemented

Replace the resident's public report removal request with an archive request. Keep existing pending removal requests compatible.

An eligible Moderator, Coordinator or Administrator can approve a pending request with an Archive report button and a required private reason. Verify permissions on the server and transactionally against the current profile.

Archiving hides the public report and its public photos, retains the resident's private record, evidence and operator history, records an audit event, and notifies the resident according to notification preferences. Retrying the same approval must not duplicate decisions or notifications. Later or concurrent report actions must not republish archived reports.

Show Archived in My reports and the operator detail. Keep failures recoverable and provide English and Filipino labels. Unpublished report withdrawal remains a separate existing action.
