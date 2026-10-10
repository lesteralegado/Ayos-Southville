import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedOperator } from "@/features/auth/session";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";
import { ModerationForbiddenError, type ModerationReport } from "@/features/reports/moderation-module";

async function loadQueue(): Promise<ModerationReport[]> {
  const actor = await getVerifiedOperator();
  if (!actor) redirect("/sign-in?next=/moderation");
  try { return await getModerationModule().listQueue(actor); }
  catch (error) { if (error instanceof ModerationForbiddenError) redirect("/account"); throw error; }
}

export default async function ModerationPage() {
  const reports = await loadQueue();
  return <main className="account-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link></header><section><p className="eyebrow">Private operator workspace</p><h1>Incoming reports</h1><p>Review resident details only when needed. Publish a redacted summary before making a report public.</p>{reports.length === 0 ? <p className="empty-state">No submitted reports are waiting for review.</p> : <ul className="report-list">{reports.map((report) => <li key={report.reference}><strong>{report.reference}</strong><span>{report.category} · {report.nearbyLandmark}</span><p>{report.description}</p></li>)}</ul>}</section></main>;
}