"use client";

import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";
import type { PublicReportDetail } from "./report-module";

const categoryLabels = {
  en: { "roads-drainage": "Roads and drainage", streetlights: "Broken streetlight", "waste-collection": "Waste collection" },
  fil: { "roads-drainage": "Kalsada at kanal", streetlights: "Sirang ilaw sa kalsada", "waste-collection": "Koleksyon ng basura" },
} as const;

export function ReportDetail({ report, newlySubmitted }: { report: PublicReportDetail; newlySubmitted: boolean }) {
  const { locale } = useLocale();
  const fil = locale === "fil";
  return (
    <main className="detail-page">
      <header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account/reports">{fil ? "Aking mga ulat" : "My reports"}</Link></header>
      <article className="detail-card">
        {newlySubmitted && <div className="receipt-banner" role="status"><strong>{fil ? "Naitala ang iyong ulat." : "Your report was recorded."}</strong><span>{fil ? "Itago ang reference na ito" : "Keep this reference"}: {report.reference}</span></div>}
        <div className="report-card__topline"><span className="eyebrow">{categoryLabels[locale][report.category]}</span><span className="status status-review">{report.status}</span></div>
        <h1>{report.description}</h1>
        <p className="report-place"><span aria-hidden="true">⌖</span>{report.publicArea}</p>
        <dl className="report-meta"><div><dt>{fil ? "Reference" : "Reference"}</dt><dd>{report.reference}</dd></div><div><dt>{fil ? "Isinumite" : "Submitted"}</dt><dd>{new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(report.submittedAt))}</dd></div></dl>
        <section className="timeline" aria-labelledby="timeline-title"><h2 id="timeline-title">{fil ? "Timeline" : "Timeline"}</h2><ol>{report.timeline.map((event) => <li key={`${event.status}-${event.occurredAt}`}><span className="timeline-dot" /><div><strong>{event.status}</strong><time dateTime={event.occurredAt}>{new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(event.occurredAt))}</time></div></li>)}</ol></section>
      </article>
    </main>
  );
}
