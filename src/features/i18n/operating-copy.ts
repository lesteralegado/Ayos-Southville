// Stable identifiers keep operating copy aligned across administrator and resident surfaces.
const messages = {
  "pauseNewReports": {
    "en": "Pause new reports",
    "fil": "I-pause ang bagong ulat"
  },
  "pauseInvitations": {
    "en": "Pause invitations",
    "fil": "I-pause ang imbitasyon"
  },
  "restrictUnsafePublicReports": {
    "en": "Restrict unsafe public reports",
    "fil": "Limitahan ang hindi ligtas na pampublikong ulat"
  },
  "coverageAndAvailability": {
    "en": "Coverage and availability",
    "fil": "Mga operator at availability"
  },
  "pauseIntakeWhenNeitherOperatorIsAvailableOr": {
    "en": "Pause intake when neither operator is available or privacy or authorization fails. Pause invitations for broken workflows or missed reviews without coverage.",
    "fil": "I-pause ang bagong ulat kapag walang operator o may problema sa privacy o pahintulot. I-pause ang imbitasyon kapag sira ang proseso o walang operator para sa atrasadong review."
  },
  "newReports": {
    "en": "New reports:",
    "fil": "Bagong ulat:"
  },
  "paused": {
    "en": "paused",
    "fil": "naka-pause"
  },
  "open": {
    "en": "open",
    "fil": "bukas"
  },
  "invitations": {
    "en": "Invitations:",
    "fil": "Imbitasyon:"
  },
  "publicBrowsing": {
    "en": "Public browsing:",
    "fil": "Pampublikong pagtingin:"
  },
  "restrictedForSafety": {
    "en": "restricted for safety",
    "fil": "limitado para sa kaligtasan"
  },
  "available": {
    "en": "available",
    "fil": "available"
  },
  "coverageIsAnAdministratorSStatementNotProof": {
    "en": "Coverage is an administrator's statement, not proof of backup acceptance or live access. Verify both before release. Resuming is not release approval.",
    "fil": "Pahayag lamang ng administrator ang coverage, hindi patunay ng pagtanggap o live access ng backup. Patunayan ang dalawa bago ilunsad. Ang pagbubukas muli ay hindi approval ng release."
  },
  "operatingControls": {
    "en": "Operating controls",
    "fil": "Mga kontrol sa operasyon"
  },
  "primaryOperator": {
    "en": "Primary operator",
    "fil": "Pangunahing operator"
  },
  "backupOperator": {
    "en": "Backup operator",
    "fil": "Backup operator"
  },
  "notRecorded": {
    "en": "Not recorded",
    "fil": "Hindi pa naitala"
  },
  "noVerifiedOperatorsAreAvailableCoverageMustRemain": {
    "en": "No verified operators are available. Coverage must remain unconfirmed.",
    "fil": "Walang verified na operator. Hindi pa makukumpirma ang coverage."
  },
  "iAffirmTheBackupCoverageArrangement": {
    "en": "I affirm the backup coverage arrangement",
    "fil": "Kinukumpirma ko ang kasunduan sa backup coverage"
  },
  "keepSafeBrowsingOpenDuringOrdinaryAbsenceFor": {
    "en": "Keep safe browsing open during ordinary absence. For a privacy incident, restrict public reports until they are safe. Existing review, responses and deletion remain available.",
    "fil": "Panatilihing bukas ang ligtas na pagtingin sa ordinaryong pagliban. Limitahan ang pampublikong ulat sa insidente ng privacy hanggang ligtas na. Available pa rin ang review, tugon at pagbura."
  },
  "publicExplanationEnglish": {
    "en": "Public explanation · English",
    "fil": "Pampublikong paliwanag · English"
  },
  "publicExplanationFilipino": {
    "en": "Public explanation · Filipino",
    "fil": "Pampublikong paliwanag · Filipino"
  },
  "useAGeneralPrivacyReviewedExplanationDoNot": {
    "en": "Use a general, privacy-reviewed explanation. Do not include names, contacts, homes or private operator schedules.",
    "fil": "Gumamit ng pangkalahatang paliwanag na nasuri para sa privacy. Huwag isama ang pangalan, contact, bahay o pribadong iskedyul ng operator."
  },
  "expectedResumptionAsiaManilaOptional": {
    "en": "Expected resumption · Asia/Manila (optional)",
    "fil": "Inaasahang pagbubukas · Asia/Manila (opsyonal)"
  },
  "leaveUnknownTimesBlankReviewResumptionIsNot": {
    "en": "Leave unknown times blank. Review resumption is not a repair deadline.",
    "fil": "Iwanang blangko kung hindi pa alam. Ang pagbubukas ng review ay hindi deadline ng pagkukumpuni."
  },
  "beforeResumingIConfirmCoverageIsRestoredOr": {
    "en": "Before resuming, I confirm coverage is restored or the fault is fixed and retested",
    "fil": "Bago magbukas muli, kinukumpirma kong may operator na o naayos at nasubukang muli ang problema"
  },
  "saveOperatingControls": {
    "en": "Save operating controls",
    "fil": "I-save ang mga kontrol sa operasyon"
  },
  "changeSavedButAccessOrRefreshFailedReturn": {
    "en": "Change saved, but access or refresh failed. Return to your account and refresh before retrying.",
    "fil": "Nai-save ang pagbabago, ngunit hindi ma-refresh. Bumalik sa iyong account bago subukang muli."
  },
  "changesSaved": {
    "en": "Changes saved.",
    "fil": "Nai-save ang mga pagbabago."
  },
  "connectionLostRefreshToCheckWhetherTheChange": {
    "en": "Connection lost. Refresh to check whether the change saved before retrying.",
    "fil": "Nawala ang koneksyon. I-refresh muna upang tingnan kung nai-save bago subukang muli."
  },
  "pleaseRetry": {
    "en": "Please retry.",
    "fil": "Subukang muli."
  },
  "accessOrRefreshFailedSignInAndRetry": {
    "en": "Access or refresh failed. Sign in and retry.",
    "fil": "Hindi ma-refresh o walang access. Mag-sign in at subukan muli."
  },
  "refreshCouldNotBeConfirmedKeepYourEdits": {
    "en": "Refresh could not be confirmed. Keep your edits, reconnect and retry.",
    "fil": "Hindi makumpirma ang refresh. Panatilihin ang mga pagbabago, kumonekta at subukan muli."
  },
  "myAccount": {
    "en": "My account",
    "fil": "Aking account"
  },
  "pilotAdministration": {
    "en": "Pilot administration",
    "fil": "Pamamahala ng pilot"
  },
  "inviteNeighborsProtectAccessAndKeepReportRouting": {
    "en": "Invite neighbors, protect access, and keep report routing clear. This is an independent resident-led pilot; destinations are internal pilot desks.",
    "fil": "Mag-imbita ng kapitbahay, pamahalaan ang access, at linawin ang ruta ng mga ulat. Independent na pilot ito ng mga residente; internal na pilot desk ang mga destinasyon."
  },
  "administrationSections": {
    "en": "Administration sections",
    "fil": "Mga seksyon ng pamamahala"
  },
  "people": {
    "en": "People",
    "fil": "Mga tao"
  },
  "coverage": {
    "en": "Coverage",
    "fil": "Mga operator"
  },
  "invitationsLabel": {
    "en": "Invitations",
    "fil": "Mga imbitasyon"
  },
  "configuration": {
    "en": "Configuration",
    "fil": "Mga setting"
  },
  "auditHistory": {
    "en": "Audit history",
    "fil": "Kasaysayan ng audit"
  },
  "privacyOperations": {
    "en": "Privacy operations",
    "fil": "Mga operasyon ng privacy"
  },
  "twoAdministratorAccountsAreVerifiedBackupCoverageStill": {
    "en": "Two administrator accounts are verified; backup coverage still needs demonstration.",
    "fil": "Verified ang dalawang administrator; kailangan pa ring patunayan ang backup coverage."
  },
  "beforeLaunchAddASecondVerifiedAdministrator": {
    "en": "Before launch, add a second verified administrator.",
    "fil": "Bago ilunsad, magdagdag ng pangalawang verified administrator."
  },
  "verifiedAdministrators": {
    "en": "verified administrators",
    "fil": "verified na administrator"
  },
  "saving": {
    "en": "Saving…",
    "fil": "Sine-save…"
  },
  "refreshOperatingControls": {
    "en": "Refresh operating controls",
    "fil": "I-refresh ang mga kontrol sa operasyon"
  },
  "returnToAccount": {
    "en": "Return to account",
    "fil": "Bumalik sa account"
  },
  "peopleAndAccess": {
    "en": "People and access",
    "fil": "Mga tao at access"
  },
  "approvalAllowsReportingRolesGrantOperationalCapabilitiesRevoking": {
    "en": "Approval allows reporting. Roles grant operational capabilities. Revoking pilot access stops resident submissions even for an invited email.",
    "fil": "Ang approval ay nagpapahintulot ng pag-uulat. Ang tungkulin ay nagbibigay ng kakayahan sa pamamahala. Ang pagbawi ng access ay humihinto sa pagsumite kahit may imbitasyon."
  },
  "residentsAppearHereAfterCreatingAnAccount": {
    "en": "Residents appear here after creating an account.",
    "fil": "Lalabas dito ang mga residente matapos gumawa ng account."
  },
  "verifiedEmail": {
    "en": "Verified email",
    "fil": "Verified na email"
  },
  "emailNotVerified": {
    "en": "Email not verified",
    "fil": "Hindi pa verified ang email"
  },
  "accessRevoked": {
    "en": "Access revoked",
    "fil": "Binawi ang access"
  },
  "approved": {
    "en": "Approved",
    "fil": "Aprubado"
  },
  "invitationOrOperatorAccess": {
    "en": "Invitation or operator access",
    "fil": "Access ayon sa imbitasyon o tungkulin"
  },
  "pilotAccess": {
    "en": "Pilot access",
    "fil": "Access sa pilot"
  },
  "accessDecision": {
    "en": "Access decision",
    "fil": "Desisyon sa access"
  },
  "approve": {
    "en": "Approve",
    "fil": "Aprubahan"
  },
  "revoke": {
    "en": "Revoke",
    "fil": "Bawiin"
  },
  "accessReason": {
    "en": "Access reason",
    "fil": "Dahilan sa access"
  },
  "saveAccess": {
    "en": "Save access",
    "fil": "I-save ang access"
  },
  "capabilities": {
    "en": "Capabilities",
    "fil": "Mga kakayahan"
  },
  "resident": {
    "en": "Resident",
    "fil": "Residente"
  },
  "moderator": {
    "en": "Moderator",
    "fil": "Tagasuri"
  },
  "coordinator": {
    "en": "Coordinator",
    "fil": "Tagapag-ugnay"
  },
  "administrator": {
    "en": "Administrator",
    "fil": "Tagapamahala"
  },
  "roleChangeReason": {
    "en": "Role change reason",
    "fil": "Dahilan ng pagbabago sa tungkulin"
  },
  "saveRoles": {
    "en": "Save roles",
    "fil": "I-save ang mga tungkulin"
  },
  "inviteAResident": {
    "en": "Invite a resident",
    "fil": "Mag-imbita ng residente"
  },
  "addTheEmailTheyWillVerifyDuringRegistration": {
    "en": "Add the email they will verify during registration. This approves access; it does not send an invitation email. Share the registration link personally.",
    "fil": "Idagdag ang email na kanilang ibe-verify sa pagpaparehistro. Nagbibigay ito ng access; walang ipinapadalang email. Personal na ibahagi ang link sa pagpaparehistro."
  },
  "invitationDetails": {
    "en": "Invitation details",
    "fil": "Mga detalye ng imbitasyon"
  },
  "emailAddress": {
    "en": "Email address",
    "fil": "Email address"
  },
  "invitationReason": {
    "en": "Invitation reason",
    "fil": "Dahilan ng imbitasyon"
  },
  "inviteResident": {
    "en": "Invite resident",
    "fil": "Imbitahan ang residente"
  },
  "noInvitationsYetAddYourFirstPilotParticipant": {
    "en": "No invitations yet. Add your first pilot participant above.",
    "fil": "Wala pang imbitasyon. Idagdag sa itaas ang unang kalahok."
  },
  "active": {
    "en": "Active",
    "fil": "Aktibo"
  },
  "revoked": {
    "en": "Revoked",
    "fil": "Binawi"
  },
  "changeReason": {
    "en": "Change reason",
    "fil": "Dahilan ng pagbabago"
  },
  "revokeInvitation": {
    "en": "Revoke invitation",
    "fil": "Bawiin ang imbitasyon"
  },
  "restoreInvitation": {
    "en": "Restore invitation",
    "fil": "Ibalik ang imbitasyon"
  },
  "reportingConfiguration": {
    "en": "Reporting configuration",
    "fil": "Mga setting ng pag-uulat"
  },
  "keepIdentifiersStableDeactivateEntriesInsteadOfRenaming": {
    "en": "Keep identifiers stable. Deactivate entries instead of renaming identifiers used by existing reports. Changes apply after saving.",
    "fil": "Panatilihin ang mga identifier. I-deactivate ang mga entry sa halip na palitan ang identifier na ginagamit na sa mga ulat. Magkakabisa matapos i-save."
  },
  "responsibleDestinations": {
    "en": "Responsible destinations",
    "fil": "Mga destinasyon"
  },
  "identifier": {
    "en": "Identifier",
    "fil": "Identifier"
  },
  "destinationName": {
    "en": "Destination name",
    "fil": "Pangalan ng destinasyon"
  },
  "addDestination": {
    "en": "Add destination",
    "fil": "Magdagdag ng destinasyon"
  },
  "reportCategories": {
    "en": "Report categories",
    "fil": "Mga kategorya ng ulat"
  },
  "categoryIdentifier": {
    "en": "Category identifier",
    "fil": "Identifier ng kategorya"
  },
  "englishLabel": {
    "en": "English label",
    "fil": "Label sa English"
  },
  "filipinoLabel": {
    "en": "Filipino label",
    "fil": "Label sa Filipino"
  },
  "destination": {
    "en": "Destination",
    "fil": "Destinasyon"
  },
  "addCategory": {
    "en": "Add category",
    "fil": "Magdagdag ng kategorya"
  },
  "verifiedEmergencyGuidance": {
    "en": "Verified emergency guidance",
    "fil": "Verified na gabay sa emergency"
  },
  "emergencyMessage": {
    "en": "Emergency message",
    "fil": "Mensahe sa emergency"
  },
  "emergencyPhone": {
    "en": "Emergency phone",
    "fil": "Telepono sa emergency"
  },
  "verifiedHttpsSource": {
    "en": "Verified HTTPS source",
    "fil": "Verified na HTTPS source"
  },
  "configurationChangeReason": {
    "en": "Configuration change reason",
    "fil": "Dahilan ng pagbabago sa mga setting"
  },
  "saveConfiguration": {
    "en": "Save configuration",
    "fil": "I-save ang mga setting"
  },
  "latestPrivilegedActionsPrivateToAdministrators": {
    "en": "Latest 100 privileged actions. Private to administrators.",
    "fil": "Pinakabagong 100 aksyon sa pamamahala. Pribado para sa mga administrator."
  },
  "savedAdministrativeChangesWillAppearHere": {
    "en": "Saved administrative changes will appear here.",
    "fil": "Lalabas dito ang mga nai-save na pagbabago sa pamamahala."
  },
  "actor": {
    "en": "Actor",
    "fil": "Gumawa"
  },
  "target": {
    "en": "Target",
    "fil": "Pakay"
  },
  "availabilityCouldNotBeConfirmedYourDraftRemains": {
    "en": "Availability could not be confirmed. Your draft remains; reconnect and retry.",
    "fil": "Hindi makumpirma ang availability. Nananatili ang draft; kumonekta at subukan muli."
  },
  "newReportsArePaused": {
    "en": "New reports are paused",
    "fil": "Pansamantalang sarado ang bagong ulat"
  },
  "yourDraftRemainsRetryAfterIntakeResumes": {
    "en": "Your draft remains. Retry after intake resumes.",
    "fil": "Nananatili ang draft. Subukan muli kapag bukas na ang bagong ulat."
  },
  "expectedResumption": {
    "en": "Expected resumption: ",
    "fil": "Inaasahang pagbubukas: "
  },
  "resumptionDetailsCouldNotBeConfirmedCheckAvailability": {
    "en": "Resumption details could not be confirmed. Check availability.",
    "fil": "Hindi pa makumpirma ang mga detalye ng pagbubukas. Suriin ang availability."
  },
  "resumptionTimeIsNotYetKnown": {
    "en": "Resumption time is not yet known.",
    "fil": "Wala pang tiyak na oras ng pagbubukas."
  },
  "thisIsNotARepairDeadlineExistingReports": {
    "en": "This is not a repair deadline. Existing reports, responses and deletion remain available.",
    "fil": "Hindi ito deadline ng pagkukumpuni. Available pa rin ang kasalukuyang mga ulat, tugon at pagbura."
  },
  "checking": {
    "en": "Checking…",
    "fil": "Sinusuri…"
  },
  "checkAvailability": {
    "en": "Check availability",
    "fil": "Suriin ang availability"
  },
  "newReportsArePausedYourPrivatePhotoRemains": {
    "en": "New reports are paused. Your private photo remains on this device; retry after intake resumes.",
    "fil": "Naka-pause ang bagong ulat. Nananatili ang pribadong litrato sa device; subukan kapag bukas na."
  },
  "conflict": {
    "en": "Settings changed. Refresh before retrying.",
    "fil": "Nagbago ang mga setting. I-refresh bago subukang muli."
  },
  "invitationsPaused": {
    "en": "Invitations are paused. Existing access is unchanged.",
    "fil": "Naka-pause ang imbitasyon. Nananatili ang kasalukuyang access."
  }
} as const;
export type OperatingCopyKey = keyof typeof messages;
export function operatingCopy(locale: "en" | "fil", key: OperatingCopyKey): string {
  return messages[key][locale];
}

