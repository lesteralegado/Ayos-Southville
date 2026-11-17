"use client";
import { useState, type FormEvent } from "react";
import type { ModerationReport, Operator } from "./moderation-module";
import { canClarifyReport, pendingClarification, unpublishedCorrection } from "./report-clarification";
import { preparePublicDraft } from "./public-report-draft";
import { clarificationCopy } from "./clarification-copy";

export function OperatorClarification({ report, actor, locale, pending, mutate }: { report: ModerationReport; actor: Operator; locale: "en" | "fil"; pending: boolean; mutate(action: string, input: Record<string, unknown>): Promise<void> }) {
  const copy = clarificationCopy[locale], request = pendingClarification(report);
  const [operationId] = useState(() => crypto.randomUUID());
  const draft = preparePublicDraft(report);
  const canPublish = actor.roles.some(role => ["Moderator", "Administrator"].includes(role)) && !request && unpublishedCorrection(report);
  if (!actor.roles.some(role => ["Moderator", "Coordinator", "Administrator"].includes(role))) return null;
  const active = canClarifyReport(report);
  async function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutate(action, { reference: report.reference, expectedRevision: report.revision ?? 0, operationId,
      ...(request ? { requestId: request.id } : {}),
      ...Object.fromEntries(data.entries()), privacyReviewed: data.get("privacyReviewed") === "on",
    });
  }
  return <section className="clarification-panel" aria-labelledby="operator-clarification-title">
    <h3 id="operator-clarification-title">{copy.title}</h3><p>{copy.private}</p>
    {active && !request && unpublishedCorrection(report) && !canPublish && <p role="status">{locale === "en" ? "A Moderator or Administrator must privacy-review and publish the accepted correction before work continues." : "Kailangang suriin ng Moderator o Administrator ang privacy at ilathala ang tinanggap na pagwawasto bago magpatuloy."}</p>}
    {active && request && <>
      <p role="status"><strong>{request.response ? copy.reviewWaiting : copy.waiting}</strong></p><blockquote>{request.question}</blockquote>
      {request.response && <div><p>{request.response.explanation}</p>{request.response.description && <p>{copy.description}: {request.response.description}</p>}{request.response.nearbyLandmark && <p>{copy.landmark}: {request.response.nearbyLandmark}</p>}{request.response.location && <p>{copy.pin}: {request.response.location.latitude}, {request.response.location.longitude}</p>}</div>}
      <form onSubmit={event => void submit(event, "review-clarification")}><fieldset disabled={pending}>
        <label>{copy.reason}<textarea name="reason" required maxLength={1000} /></label>
        <label>{copy.review}<select name="decision" defaultValue={request.response ? "accepted" : "declined"}>{request.response && <option value="accepted">{copy.accept}</option>}<option value="declined">{copy.decline}</option></select></label>
        <button className="button button-primary">{pending ? copy.saving : copy.review}</button>
      </fieldset></form>
    </>}
    {active && !request && <details className="advanced-disclosure"><summary>{copy.ask}</summary><form onSubmit={event => void submit(event, "request-clarification")}><fieldset disabled={pending}>
      <label>{copy.question}<textarea name="question" required maxLength={1000} /></label><button className="button button-quiet">{pending ? copy.saving : copy.ask}</button>
    </fieldset></form></details>}
    {active && canPublish && <form onSubmit={event => void submit(event, "publish-clarification")}><fieldset disabled={pending}>
      <legend>{copy.publish}</legend><label>{copy.summary}<textarea name="publicSummary" defaultValue={draft.summary} required maxLength={1000} /></label><label>{copy.area}<input name="publicArea" defaultValue={draft.area} required maxLength={160} /></label>
      {draft.latitude && draft.longitude && <p>{copy.pin}: {draft.latitude}, {draft.longitude}</p>}
      <label><input type="checkbox" name="privacyReviewed" required />{copy.privacy}</label><button className="button button-primary">{pending ? copy.saving : copy.publish}</button>
    </fieldset></form>}
    {report.clarifications?.some(item => item.decision) && <details className="advanced-disclosure"><summary>{copy.history}</summary><ol>{report.clarifications.filter(item => item.decision).map(item => <li key={item.id}><p>{item.question}</p>{item.response && <p>{item.response.explanation}</p>}<p>{item.decision?.outcome === "accepted" ? copy.accepted : copy.declined}: {item.decision?.reason}</p></li>)}</ol></details>}
  </section>;
}
