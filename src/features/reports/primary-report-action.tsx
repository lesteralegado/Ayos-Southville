"use client";
import { useState, type FormEvent } from "react";
import type { EvidenceAsset } from "./report-module";
import type { ModerationReport, Operator } from "./moderation-module";
import { EvidencePicker } from "./evidence-picker";
import { preparePublicDraft } from "./public-report-draft";
import { operatorFlowCopy } from "./operator-flow-copy";

export function PrimaryReportAction({ report, actor, locale, pending, mutate }: { report: ModerationReport; actor: Operator; locale: "en" | "fil"; pending: boolean; mutate(action: string, input: Record<string, unknown>): Promise<void> }) {
  const copy = operatorFlowCopy[locale];
  const [draft, setDraft] = useState(() => preparePublicDraft(report));
  const [assets, setAssets] = useState<EvidenceAsset[]>([]), [uploadBlocked, setUploadBlocked] = useState(true);
  const publishing = report.status === "Submitted";
  const permitted = publishing ? actor.roles.some(role => ["Moderator", "Administrator"].includes(role)) : actor.roles.some(role => ["Coordinator", "Administrator"].includes(role));
  if (!permitted || !["Submitted", "Under review", "Assigned", "In progress"].includes(report.status)) return null;
  const resolving = report.status === "In progress";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget), text = (name: string) => String(data.get(name) ?? "");
    const base = { reference: report.reference, expectedRevision: report.revision ?? 0 };
    if (publishing) await mutate("accept", { ...base, publicSummary: draft.summary, publicArea: draft.area, ...(draft.latitude && draft.longitude ? { publicLocation: { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } } : {}), approvedMedia: data.getAll("approved").map(id => ({ id, alt: text(`alt-${id}`) })), reason: "Privacy reviewed; public draft approved." });
    else await mutate("transition", { ...base, to: resolving ? "Resolved" : "In progress", update: { en: text("en"), fil: text("fil") }, ...(resolving ? { resolutionEvidence: assets } : {}) });
  }
  return <form onSubmit={event => void submit(event)} className="primary-report-action">
    <fieldset disabled={pending}>
      <legend>{publishing ? copy.publish : resolving ? copy.resolve : copy.start}</legend>
      {publishing ? <>
        <div className="publication-comparison">
          <section><h3>{copy.original}</h3><p>{report.description}</p><p>{report.nearbyLandmark}</p></section>
          <section><h3>{copy.draft}</h3><p className="public-draft-summary">{draft.summary}</p><p>{draft.area}</p>{draft.latitude && draft.longitude && <p>{draft.latitude}, {draft.longitude}</p>}</section>
        </div>
        <p className="publication-warning">{copy.privacy}</p>
        <details className="advanced-disclosure"><summary>{copy.edit}</summary>
          <label htmlFor="public-draft-summary">{copy.summary}</label><textarea id="public-draft-summary" name="summary" value={draft.summary} required maxLength={1000} onChange={event => setDraft(current => ({ ...current, summary: event.target.value }))} />
          <label>{copy.area}<input name="area" value={draft.area} required maxLength={160} onChange={event => setDraft(current => ({ ...current, area: event.target.value }))} /></label>
          <div className="operator-coordinate-row"><label>{copy.latitude}<input type="number" step="0.01" min="-90" max="90" value={draft.latitude} onChange={event => setDraft(current => ({ ...current, latitude: event.target.value }))} /></label><label>{copy.longitude}<input type="number" step="0.01" min="-180" max="180" value={draft.longitude} onChange={event => setDraft(current => ({ ...current, longitude: event.target.value }))} /></label></div>
        </details>
        {report.evidence.length > 0 && <div className="publication-media">{report.evidence.map((asset, index) => <div key={asset.id}>
          <a href={`/api/evidence/${asset.id}`} target="_blank" rel="noreferrer">{copy.approvePhoto} {index + 1}</a>
          <label><input type="checkbox" name="approved" value={asset.id} />{copy.approvePhoto} {index + 1}</label>
          <label>{copy.alt} {index + 1}<input name={`alt-${asset.id}`} maxLength={400} /></label>
        </div>)}</div>}
      </> : <>
        <label htmlFor="primary-update-en">{copy.english}</label><textarea id="primary-update-en" name="en" required maxLength={1000} defaultValue={resolving ? "" : copy.started} />
        <label htmlFor="primary-update-fil">{copy.filipino}</label><textarea id="primary-update-fil" name="fil" required maxLength={1000} defaultValue={resolving ? "" : copy.startedFil} />
        {resolving && <><h3>{copy.evidence}</h3><p>{copy.evidenceHelp}</p><EvidencePicker required owner={actor.uid} draftKey={`resolution_${report.reference}`} locale={locale} onAssets={setAssets} onBlocked={setUploadBlocked} /></>}
      </>}
      <button className="button button-primary" type="submit" disabled={pending || (resolving && (uploadBlocked || !assets.length))}>{pending ? copy.saving : publishing ? copy.publish : resolving ? copy.resolve : copy.start}</button>
    </fieldset>
  </form>;
}
