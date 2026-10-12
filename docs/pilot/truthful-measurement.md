# Truthful pilot measurement

Use Administration → Pilot measurement (administrator-only). Record no real trial findings or start approval merely because the app is deployed or automated tests pass. The operational-release evidence and explicit owner approval must precede recruitment and the real trial.

## Findings and provenance

Assign one stable pseudonymous P01–P9999 code to each participant. Reuse it when correcting outcomes; select the existing finding to load its current revision. Keep any code-to-person mapping outside aggregate findings and subject to the participant privacy/deletion procedure. Names, contact details, exact homes and unrestricted notes have no measurement input field and are not returned from legacy documents.

Choose Real trial, Exercise or Unknown. Real findings require an explicitly started trial and the administrator's affirmation of adult eligibility and current consent. This records the administrator's statement, not independent verification of a consent receipt or real participation. Never affirm it for synthetic verification fixtures. Unlabelled legacy records remain Unknown; they do not silently become real. Existing source cannot be changed in the edit form; do not relabel an exercise to manufacture real evidence.

For submission, assistance, status comprehension, duplicate discovery and lifecycle completion, record Yes, No or Uncollected. No default is success. Failed, assisted and uncollected attempts stay in the unique-participant denominator. Unassisted submission requires submitted Yes and assistance No. Sample size below 10 is insufficient even when the displayed rate is high. At least 80% of the real sample must have unassisted submissions; 8 of 10 satisfies that target. No thresholds are imposed on other outcomes. Exercise and Unknown summaries are separate and never count toward real trial findings or community repair totals.

Correction is revision-protected. An interrupted save may already have committed; do not repeat it blindly. Inputs remain while confirmation is unavailable, further mutations are disabled, and Reload findings recovers authoritative records. Reload does not invent success or add participants. The measurement store does not create reports, resolutions, media, invitations or public insights.

## Exercises stay isolated

Use existing local external-provider fixtures or an explicitly isolated non-production demo Firebase project for fictional report/evidence exercises. The existing seed script requires demo mode and a separate project ending in -demo; production demo mode is refused. Demo projections remain in demoPublicReports, not real public discovery. Do not create fictional repairs through live intake or use production seeding to inflate a case study. Recording an Exercise measurement does not authorize creating fictional live reports.

## Trial and weekly review

After actual release approval, record its evidence reference code, reviewed-prerequisite affirmation and explicit Manila start time. No deployment date or approval is prefilled; the start cannot be in the future or silently restarted. A code such as EVID-01 refers to a privately maintained evidence record, not unrestricted notes or a public claim that prerequisites were independently verified.

The planned review boundary is 28 days after the explicit start. Review weekly (weeks 1–4); record an evidence code, safety/coverage review, and continue/pause/expand/stop decision. Current or elapsed weeks are permitted, not future weeks. Records preserve earlier decisions. Continue or expand requires both reviewed safety and coverage. Initial capacity is 10; expansion must increase it, never exceed 25 and cannot send invitations. Real finding additions are limited to the reviewed capacity; edits do not consume another place. A pause/stop decision is an evaluation record: apply operational intake/invitation pauses separately when needed.

Neither the planned date nor a pause/stop decision sets pilotEndedAt. The irreversible retention-triggering end remains the existing separate, explicitly authorized procedure. Measurement and trial evaluation records join the existing pilot retention inventory. Collect participant withdrawal/deletion requests through the existing privacy procedure; do not put identities in aggregate records merely to make them discoverable.

Recording approval, consent, weekly reviews or findings is not proof of real participants, dependable operator access, acceptable safety or repair outcomes. Operational-release and real four-week evaluation gates remain open until their actual evidence is collected.

## Approved participant withdrawal and restore

Before completing an approved privacy request or destroying the separate private code-to-person mapping, the administrator must resolve that participant's stable code and erase every applicable Real, Exercise and Unknown finding. Account deletion alone cannot discover this separate pseudonymous code. Keep identifying information in the existing private request process, never in measurement inputs or erasure evidence codes.

While signed in as a verified administrator, load GET /api/pilot-measurement for the source, participantCode and current revision. Send a same-origin JSON POST to /api/pilot-measurement with action "erase-finding", that source and participantCode, expectedRevision, deletionApproved: true and a pseudonymous evidenceCode such as "EVID-PRIVACY-01". This is an explicit, destructive operator action for an approved request, not an automatic consequence of viewing this page. Confirm with a fresh GET that each relevant finding is absent before completing the private request. A stale revision is refused; reload before retrying. Lost acknowledgements are safe to recover: the erasure is idempotent and the code must never be reassigned.

The measurementErasures ledger holds only source, pseudonymous code, evidence reference and timestamps, using the existing audit-retention policy. It blocks edits/recreation and excludes restored findings from reads and denominators. Restore the latest measurementErasures ledger alongside the latest account erasureLedger before enabling any restored environment's traffic; do not restore an older ledger over the current one. Complete the erasure operation again to physically remove any restored matching documents. Restores and production deletion still require their existing explicit authorizations; none were executed during implementation.
