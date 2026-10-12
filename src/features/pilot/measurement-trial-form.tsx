import type { FormEvent } from "react";
import type { PilotTrial } from "./pilot-measurement";
import { measurementCopy } from "./measurement-copy";
import { formatManilaDate } from "@/features/reports/report-presentation";
export function MeasurementTrialForm({ trial, pending, locale, save }: { trial: PilotTrial | null; pending: boolean; locale: "en" | "fil"; save(input: Record<string, unknown>): Promise<void> }) {
  const copy = measurementCopy[locale];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget), text = (key: string) => String(data.get(key) ?? "");
    await save(trial ? { action: "review-trial", expectedRevision: trial.revision, week: Number(text("week")), decision: text("decision"), capacity: Number(text("capacity")), safetyReviewed: data.get("safety") === "on", coverageReviewed: data.get("coverage") === "on", evidenceCode: text("evidence") } : { action: "start-trial", expectedRevision: 0, releaseApproved: data.get("approval") === "on", prerequisitesReviewed: data.get("prerequisites") === "on", evidenceCode: text("evidence"), startedAt: new Date(text("start") + "+08:00").toISOString() });
  }
  return <section id="trial" className="admin-section"><h2>{copy.trial}</h2><p>{copy.trialHelp}</p><p>{copy.retention}</p>
    {trial ? <><p>{copy.start}: <time dateTime={trial.startedAt}>{formatManilaDate(trial.startedAt, locale, true)}</time></p><p>{copy.approvedAt}: {formatManilaDate(trial.releaseApprovedAt, locale, true)} · {trial.evidenceCode}</p><p>{copy.planned}: <time dateTime={trial.plannedThrough}>{formatManilaDate(trial.plannedThrough, locale, true)}</time></p><p>{copy.capacity}: {trial.capacity}</p>{!trial.reviews?.length ? <p>{copy.noReviews}</p> : <ol>{trial.reviews.map((review, index) => <li key={index}>{copy.week}: {review.week} · {copy[review.decision]} · {review.evidenceCode}<p>{formatManilaDate(review.recordedAt, locale, true)} · {copy.capacity}: {review.capacity} · {copy.safety}: {review.safetyReviewed ? copy.yes : copy.no} · {copy.coverage}: {review.coverageReviewed ? copy.yes : copy.no}</p></li>)}</ol>}</> : <p>{copy.notStarted}</p>}
    <form onSubmit={event => void submit(event)}><fieldset disabled={pending}><legend>{trial ? copy.reviewAction : copy.startAction}</legend>
      {trial ? <><div className="admin-emergency-grid"><label>{copy.week}<input name="week" type="number" min={1} max={4} required /></label><label>{copy.decision}<select name="decision">{(["continue", "pause", "expand", "stop"] as const).map(value => <option key={value} value={value}>{copy[value]}</option>)}</select></label><label>{copy.capacity}<input name="capacity" type="number" min={10} max={25} defaultValue={trial.capacity} required /></label></div><label className="admin-check"><input name="safety" type="checkbox" />{copy.safety}</label><label className="admin-check"><input name="coverage" type="checkbox" />{copy.coverage}</label></> : <><label className="admin-check"><input name="approval" type="checkbox" required />{copy.approval}</label><label className="admin-check"><input name="prerequisites" type="checkbox" required />{copy.prerequisites}</label><label>{copy.start}<input name="start" type="datetime-local" required /></label></>}
      <label>{copy.evidence}<input name="evidence" pattern="EVID-[A-Z0-9-]{1,40}" maxLength={45} required /></label><button className="button button-primary" type="submit">{trial ? copy.reviewAction : copy.startAction}</button>
    </fieldset></form>
  </section>;
}
