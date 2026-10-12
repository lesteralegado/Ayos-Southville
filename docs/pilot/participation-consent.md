# Participation consent and recruitment permission

## Before any invitation

The owner explains, in the resident's preferred English or Filipino, that Ayos Southville is an independent resident-led trial, not an official repair service. Explain the four-week controlled pilot after release approval, voluntary participation by adults, the absence of guaranteed repairs, public/private information boundaries, retention, deletion and the ability to decline. Allow questions and time to decide without pressure.

Obtain the resident's permission to receive an invitation before adding or approving access. Do not treat registration, email verification, an invitation, an administrator's statement or an in-app checkbox as proof of this prior recruitment permission. Keep any necessary permission record private and minimal under the existing privacy process; do not collect identity documents, dates of birth or unrestricted recruitment notes. Recruitment and launch still require the owner's release approval; this document authorizes neither.

## In-app participation choice

Verified invitation/approval and participation consent are separate. The account page shows the disclosure before two unchecked acknowledgements: adulthood (at least 18) and voluntary participation. Declining is a local choice that submits nothing, creates no consent receipt and deletes no account. The resident can reconsider. Once consent has been confirmed, the receipt remains private; the resident may stop reporting and request account/data deletion through the existing privacy workflow.

The current disclosure version is `southville-adult-pilot-2026-10-12`. Its English and Filipino content is [consent-copy.ts](../../src/features/pilot/consent-copy.ts). A material disclosure change requires a new version, new review and fresh affirmative consent; never silently edit the meaning of a version already acknowledged. This implements the product's participation requirement, not a claim of legal certification or that real recruitment permission was obtained.

## Private receipt and enforcement

Each identity has one current receipt in server-only `pilotConsents`. Stored fields are the authenticated resident UID, random receipt reference, disclosure version, server confirmation time, affirmative adult acknowledgement and acknowledgement language. The affirmative operation itself records consent; no date of birth, identity document, private report content or IP address is collected for this receipt. Responses explicitly project only the receipt fields, use private/no-store caching and never log the private receipt. Firestore's default-deny rules prohibit client access; only the authenticated private API serves the owner's receipt.

Concurrent retries return the same current-version receipt. Acceptance rechecks current verification, invitation/approval, revocation, deletion and pilot-end locks. Report creation, resident engagement, resident resolution responses and intake/supporting photos check current consent at their write transactions. Resolution photos and operator duties remain capability-controlled operational work, not resident enrollment. Private history, receipt recovery, notification preferences, sign-in and deletion do not require new participation consent.

If an acknowledgement is lost, reload private status before claiming enrollment or non-enrollment. Retry cannot create a second current-version receipt. Existing verified/approved accounts are not silently migrated to consented accounts.

## Retention and deletion

Consent records join the existing pilot-record inventory: access expires and cleanup removes them 90 days after the administrator-recorded pilot end. Approved account deletion removes identity-linked consent through the existing locked cleanup workflow. Restores must replay the current erasure ledger before traffic resumes; consent is not an exemption. Retention preview/application authority, independent target pins and destructive-operation approvals are unchanged. No cleanup or restore was executed against an external environment for this implementation.

Real provider persistence, two-account demonstrations, human accessibility checks and real consented participants remain later release/evaluation gates.
