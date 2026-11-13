"use client";
import type { FormEvent } from "react";
import type { ModerationReport, Operator } from "./moderation-module";
import { operatorFlowCopy } from "./operator-flow-copy";

export function ReassignReportOwner({ report, actor, locale, pending, mutate }: { report: ModerationReport; actor: Operator; locale: "en" | "fil"; pending: boolean; mutate(action: string, input: Record<string, unknown>): Promise<void> }) {
  if (!actor.roles.some(role => ["Coordinator", "Administrator"].includes(role)) || !["Submitted", "Under review", "Assigned", "In progress"].includes(report.status)) return null;
  const copy = operatorFlowCopy[locale];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void mutate("reassign-owner", { reference: report.reference, expectedRevision: report.revision ?? 0, ownerUid: String(data.get("ownerUid")), reason: String(data.get("reason")) });
  }
  return <form onSubmit={submit}><fieldset disabled={pending}><legend>{copy.reassign}</legend><label>{copy.owner}<input name="ownerUid" required maxLength={128} defaultValue={report.reviewOwnerUid ?? ""} /></label><label>{copy.reason}<textarea name="reason" required maxLength={4000} /></label><button className="button button-quiet" type="submit">{copy.reassign}</button></fieldset></form>;
}
