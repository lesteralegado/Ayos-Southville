"use client";
import { useRef, type FormEvent } from "react";
import type { ModerationReport, Operator } from "./moderation-module";
import { reviewCopy } from "./review-copy";
import { formatManilaDate } from "./report-presentation";
export function OperatorReviewPanel({ report, actor, locale, pending, mutate }: { report: ModerationReport; actor: Operator; locale: "en" | "fil"; pending: boolean; mutate(action: string, input: Record<string, unknown>): Promise<void> }) {
  const copy = reviewCopy[locale];
  const ids = useRef({ acknowledge: crypto.randomUUID(), takeover: crypto.randomUUID(), external: crypto.randomUUID() });
  const base = { reference: report.reference, expectedRevision: report.revision ?? 0 };
  const active = ["Submitted", "Under review", "Assigned", "In progress"].includes(report.status);
  function submit(event: FormEvent<HTMLFormElement>, action: "acknowledge-review" | "take-over-review" | "external-follow-up") {
    event.preventDefault();
    const data = new FormData(event.currentTarget), text = (key: string) => String(data.get(key) ?? "");
    const input = action === "acknowledge-review" ? { operationId: ids.current.acknowledge, nextStep: text("nextStep") }
      : action === "take-over-review" ? { operationId: ids.current.takeover, expectedOperatingRevision: report.reviewExpectation?.operatingRevision, privacyReviewed: data.get("privacyReviewed") === "on", update: { en: text("en"), fil: text("fil") } }
      : { operationId: ids.current.external, phase: text("phase"), organization: text("organization"), correspondence: text("correspondence") };
    void mutate(action, { ...base, ...input });
  }
  return <section className="review-section" aria-labelledby="accountable-review-title">
    <h3 id="accountable-review-title">{copy.title}</h3><p>{copy.routine}</p><p>{copy.target}</p>
    <p>{report.review ? `${copy.acknowledged}: ${formatManilaDate(report.review.acknowledgedAt, locale)}` : report.reviewExpectation?.dueAt ? `${report.reviewExpectation.overdue ? copy.overdue : copy.due}: ${formatManilaDate(report.reviewExpectation.dueAt, locale)}` : copy.unknown}</p>
    {report.review && <p>{copy.next}: {report.review.nextStep}</p>}
    {!report.review && report.reviewOwnerUid === actor.uid && <p>{copy.ownership}</p>}
    {active && !report.review && <form onSubmit={e => submit(e, "acknowledge-review")}><fieldset disabled={pending}><legend>{copy.ack}</legend><label>{copy.next}<textarea name="nextStep" required maxLength={4000} /></label><button className="button button-primary" type="submit">{copy.ack}</button></fieldset></form>}
    {report.reviewExpectation?.overdue && <><p>{copy.pause}</p>{report.reviewTakeoverAvailable && <form onSubmit={e => submit(e, "take-over-review")}><fieldset disabled={pending}><legend>{copy.takeover}</legend><label>{copy.english}<textarea name="en" required defaultValue={copy.delay} maxLength={4000} /></label><label>{copy.filipino}<textarea name="fil" required defaultValue={copy.delayFil} maxLength={4000} /></label><label className="admin-check"><input name="privacyReviewed" type="checkbox" required />{copy.privacy}</label><button className="button button-primary" type="submit">{copy.takeover}</button></fieldset></form>}</>}
    {actor.roles.some(role => ["Coordinator", "Administrator"].includes(role)) && <form onSubmit={e => submit(e, "external-follow-up")}><fieldset disabled={pending}><legend>{copy.external}</legend><p>{copy.distinction}</p><label>{copy.phase}<select name="phase">{(["forwarded", "acknowledged", "accepted", "resolved"] as const).map(phase => <option key={phase} value={phase}>{copy[phase === "acknowledged" ? "response" : phase]}</option>)}</select></label><label>{copy.organization}<input name="organization" required maxLength={4000} /></label><label>{copy.correspondence}<textarea name="correspondence" required maxLength={4000} /></label><button type="submit" className="button button-primary">{copy.record}</button></fieldset></form>}
    {!!report.externalFollowUp?.length && <><h4>{copy.history}</h4><ol>{report.externalFollowUp.map(event => <li key={event.operationId}>{copy[event.phase === "acknowledged" ? "response" : event.phase]} · {formatManilaDate(event.occurredAt, locale)}<p>{event.organization}</p><p>{event.correspondence}</p></li>)}</ol></>}
  </section>;
}
