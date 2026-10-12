"use client";
import { useState, type FormEvent } from "react";
import type { PilotUser } from "./administration-module";
import type { PilotOperations } from "./pilot-operations";

export function OperatingControls({ confirmed, users, pending, locale, save }: {
  confirmed: PilotOperations; users: PilotUser[]; pending: boolean; locale: "en" | "fil";
  save(input: { operations: PilotOperations; expectedRevision: number; recoveryConfirmed: boolean }): Promise<void>;
}) {
  const t = (en: string, fil: string) => locale === "fil" ? fil : en;
  const [draft, setDraft] = useState(confirmed);
  const eligible = users.filter(user => user.emailVerified && user.access !== "revoked" && user.roles.some(role => ["Administrator", "Moderator", "Coordinator"].includes(role)));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await save({ operations: draft, expectedRevision: confirmed.revision, recoveryConfirmed: data.get("recovery") === "on" });
  }
  return <section id="coverage" className="admin-section">
    <h2>{t("Coverage and availability", "Mga operator at availability")}</h2>
    <p>{t("Pause intake when neither operator is available or privacy or authorization fails. Pause invitations for broken workflows or missed reviews without coverage.", "I-pause ang bagong ulat kapag walang operator o may problema sa privacy o pahintulot. I-pause ang imbitasyon kapag sira ang proseso o walang operator para sa atrasadong review.")}</p>
    <div className="admin-continuity" role="status">
      <p>{t("New reports:", "Bagong ulat:")} {confirmed.intakePaused ? t("paused", "naka-pause") : t("open", "bukas")}</p>
      <p>{t("Invitations:", "Imbitasyon:")} {confirmed.invitationsPaused ? t("paused", "naka-pause") : t("open", "bukas")}</p>
      <p>{t("Public browsing:", "Pampublikong pagtingin:")} {confirmed.publicRestricted ? t("restricted for safety", "limitado para sa kaligtasan") : t("available", "available")}</p>
    </div>
    <p>{t("Coverage is an administrator's statement, not proof of backup acceptance or live access. Verify both before release. Resuming is not release approval.", "Pahayag lamang ng administrator ang coverage, hindi patunay ng pagtanggap o live access ng backup. Patunayan ang dalawa bago ilunsad. Ang pagbubukas muli ay hindi approval ng release.")}</p>
    <form onSubmit={event => void submit(event)}>
      <fieldset disabled={pending}>
        <legend>{t("Operating controls", "Mga kontrol sa operasyon")}</legend>
        <div className="admin-emergency-grid">
          {(["primaryUid", "backupUid"] as const).map(field => <label key={field}>{field === "primaryUid" ? t("Primary operator", "Pangunahing operator") : t("Backup operator", "Backup operator")}
            <select value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value, ...(field === "backupUid" ? { backupAffirmed: false } : {}) }))}>
              <option value="">{t("Not recorded", "Hindi pa naitala")}</option>
              {eligible.map(user => <option key={user.uid} value={user.uid}>{user.publicAlias || user.email || user.uid}</option>)}
            </select>
          </label>)}
        </div>
        {!eligible.length && <p>{t("No verified operators are available. Coverage must remain unconfirmed.", "Walang verified na operator. Hindi pa makukumpirma ang coverage.")}</p>}
        <label className="admin-check"><input type="checkbox" checked={draft.backupAffirmed} onChange={event => setDraft(current => ({ ...current, backupAffirmed: event.target.checked }))} />{t("I affirm the backup coverage arrangement", "Kinukumpirma ko ang kasunduan sa backup coverage")}</label>
        {([
          ["intakePaused", "Pause new reports", "I-pause ang bagong ulat"],
          ["invitationsPaused", "Pause invitations", "I-pause ang imbitasyon"],
          ["publicRestricted", "Restrict unsafe public reports", "Limitahan ang hindi ligtas na pampublikong ulat"],
        ] as const).map(([field, en, fil]) => <label className="admin-check" key={field}><input type="checkbox" checked={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.checked, ...(field === "publicRestricted" && event.target.checked ? { intakePaused: true } : {}) }))} />{t(en, fil)}</label>)}
        <p>{t("Keep safe browsing open during ordinary absence. For a privacy incident, restrict public reports until they are safe. Existing review, responses and deletion remain available.", "Panatilihing bukas ang ligtas na pagtingin sa ordinaryong pagliban. Limitahan ang pampublikong ulat sa insidente ng privacy hanggang ligtas na. Available pa rin ang review, tugon at pagbura.")}</p>
        <div className="admin-emergency-grid">
          {(["en", "fil"] as const).map(language => <label key={language}>{language === "en" ? t("Public explanation · English", "Pampublikong paliwanag · English") : t("Public explanation · Filipino", "Pampublikong paliwanag · Filipino")}
            <textarea maxLength={240} required={draft.intakePaused || draft.invitationsPaused || draft.publicRestricted} value={draft.explanation[language]} onChange={event => setDraft(current => ({ ...current, explanation: { ...current.explanation, [language]: event.target.value } }))} />
          </label>)}
        </div>
        <p>{t("Use a general, privacy-reviewed explanation. Do not include names, contacts, homes or private operator schedules.", "Gumamit ng pangkalahatang paliwanag na nasuri para sa privacy. Huwag isama ang pangalan, contact, bahay o pribadong iskedyul ng operator.")}</p>
        <label>{t("Expected resumption · Asia/Manila (optional)", "Inaasahang pagbubukas · Asia/Manila (opsyonal)")}
          <input type="datetime-local" value={draft.resumesAt ? new Date(Date.parse(draft.resumesAt) + 8 * 3600000).toISOString().slice(0, 16) : ""} onChange={event => setDraft(current => ({ ...current, resumesAt: event.target.value ? new Date(event.target.value + "+08:00").toISOString() : "" }))} />
        </label>
        <p>{t("Leave unknown times blank. Review resumption is not a repair deadline.", "Iwanang blangko kung hindi pa alam. Ang pagbubukas ng review ay hindi deadline ng pagkukumpuni.")}</p>
        <label className="admin-check"><input name="recovery" type="checkbox" />{t("Before resuming, I confirm coverage is restored or the fault is fixed and retested", "Bago magbukas muli, kinukumpirma kong may operator na o naayos at nasubukang muli ang problema")}</label>
        <button type="submit" className="button button-primary">{t("Save operating controls", "I-save ang mga kontrol sa operasyon")}</button>
      </fieldset>
    </form>
  </section>;
}
