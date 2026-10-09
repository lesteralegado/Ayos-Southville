"use client";

import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";
import type { ResidentReport } from "./report-module";

const categoryLabels = {
  en: { "roads-drainage": "Roads and drainage", streetlights: "Broken streetlight", "waste-collection": "Waste collection" },
  fil: { "roads-drainage": "Kalsada at kanal", streetlights: "Sirang ilaw sa kalsada", "waste-collection": "Koleksyon ng basura" },
} as const;

export function ResidentReportList({ reports }: { reports: ResidentReport[] }) {
  const { locale } = useLocale();
  const fil = locale === "fil";
  return <main className="reports-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account">{fil ? "Account" : "Account"}</Link></header><section className="reports-shell"><div className="section-heading"><div><span className="eyebrow">{fil ? "Resident space" : "Resident space"}</span><h1>{fil ? "Aking mga ulat" : "My reports"}</h1></div><Link className="button button-primary" href="/reports/new">{fil ? "Bagong ulat" : "New report"}</Link></div>{reports.length === 0 ? <div className="empty-state"><h2>{fil ? "Wala pang ulat" : "No reports yet"}</h2><p>{fil ? "Magsimula sa isang hindi emergency na concern sa komunidad." : "Start with a non-emergency community concern."}</p></div> : <div className="report-grid">{reports.map((report) => <Link className="report-card report-card-link" href={`/reports/${report.reference}`} key={report.reference}><div className="report-card__topline"><span className="eyebrow">{categoryLabels[locale][report.category]}</span><span className="status status-review">{report.status}</span></div><h2>{report.description}</h2><p className="report-place"><span aria-hidden="true">⌖</span>{report.nearbyLandmark}</p><footer><span>{report.reference}</span><time dateTime={report.submittedAt}>{new Intl.DateTimeFormat(fil ? "fil-PH" : "en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(report.submittedAt))}</time></footer></Link>)}</div>}</section></main>;
}
