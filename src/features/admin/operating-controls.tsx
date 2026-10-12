"use client";
import { operatingCopy, type OperatingCopyKey } from "@/features/i18n/operating-copy";
import { useState, type FormEvent } from "react";
import type { PilotUser } from "./administration-module";
import { eligibleOperator, type PilotOperations } from "./pilot-operations";
import { ReviewCalendarFields } from "./review-calendar-fields";

export function OperatingControls({ confirmed, users, pending, locale, save }: {
  confirmed: PilotOperations; users: PilotUser[]; pending: boolean; locale: "en" | "fil";
  save(input: { operations: PilotOperations; expectedRevision: number; recoveryConfirmed: boolean }): Promise<void>;
}) {
  const t = (key: OperatingCopyKey) => operatingCopy(locale, key);
  const [draft, setDraft] = useState(confirmed);
  const eligible = users.filter(eligibleOperator);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await save({ operations: draft, expectedRevision: confirmed.revision, recoveryConfirmed: data.get("recovery") === "on" });
  }
  return <section id="coverage" className="admin-section">
    <h2>{t("coverageAndAvailability")}</h2>
    <p>{t("pauseIntakeWhenNeitherOperatorIsAvailableOr")}</p>
    <div className="admin-continuity" role="status">
      <p>{t("newReports")} {confirmed.intakePaused ? t("paused") : t("open")}</p>
      <p>{t("invitations")} {confirmed.invitationsPaused ? t("paused") : t("open")}</p>
      <p>{t("publicBrowsing")} {confirmed.publicRestricted ? t("restrictedForSafety") : t("available")}</p>
    </div>
    <p>{t("coverageIsAnAdministratorSStatementNotProof")}</p>
    <form onSubmit={event => void submit(event)}>
      <fieldset disabled={pending}>
        <legend>{t("operatingControls")}</legend>
        <div className="admin-emergency-grid">
          {(["primaryUid", "backupUid"] as const).map(field => <label key={field}>{field === "primaryUid" ? t("primaryOperator") : t("backupOperator")}
            <select value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value, ...(field === "backupUid" ? { backupAffirmed: false } : {}) }))}>
              <option value="">{t("notRecorded")}</option>
              {eligible.map(user => <option key={user.uid} value={user.uid}>{user.publicAlias || user.email || user.uid}</option>)}
            </select>
          </label>)}
        </div>
        {!eligible.length && <p>{t("noVerifiedOperatorsAreAvailableCoverageMustRemain")}</p>}
        <label className="admin-check"><input type="checkbox" checked={draft.backupAffirmed} onChange={event => setDraft(current => ({ ...current, backupAffirmed: event.target.checked }))} />{t("iAffirmTheBackupCoverageArrangement")}</label>
        {([
          ["intakePaused", "pauseNewReports"],
          ["invitationsPaused", "pauseInvitations"],
          ["publicRestricted", "restrictUnsafePublicReports"],
        ] as const).map(([field, key]) => <label className="admin-check" key={field}><input type="checkbox" checked={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.checked, ...(field === "publicRestricted" && event.target.checked ? { intakePaused: true } : {}) }))} />{t(key)}</label>)}
        <p>{t("keepSafeBrowsingOpenDuringOrdinaryAbsenceFor")}</p>
        <div className="admin-emergency-grid">
          {(["en", "fil"] as const).map(language => <label key={language}>{language === "en" ? t("publicExplanationEnglish") : t("publicExplanationFilipino")}
            <textarea maxLength={240} required={draft.intakePaused || draft.invitationsPaused || draft.publicRestricted} value={draft.explanation[language]} onChange={event => setDraft(current => ({ ...current, explanation: { ...current.explanation, [language]: event.target.value } }))} />
          </label>)}
        </div>
        <p>{t("useAGeneralPrivacyReviewedExplanationDoNot")}</p>
        <label>{t("expectedResumptionAsiaManilaOptional")}
          <input type="datetime-local" value={draft.resumesAt ? new Date(Date.parse(draft.resumesAt) + 8 * 3600000).toISOString().slice(0, 16) : ""} onChange={event => setDraft(current => ({ ...current, resumesAt: event.target.value ? new Date(event.target.value + "+08:00").toISOString() : "" }))} />
        </label>
        <p>{t("leaveUnknownTimesBlankReviewResumptionIsNot")}</p>
        <label className="admin-check"><input name="recovery" type="checkbox" />{t("beforeResumingIConfirmCoverageIsRestoredOr")}</label>
        <ReviewCalendarFields value={draft.reviewCalendar} locale={locale} change={reviewCalendar => setDraft(current => ({ ...current, reviewCalendar }))} />
        <button type="submit" className="button button-primary">{t("saveOperatingControls")}</button>
      </fieldset>
    </form>
  </section>;
}
