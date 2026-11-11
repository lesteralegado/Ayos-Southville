"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { ResidentReport } from "./report-module";
import { formatManilaDate, reportCategoryLabels, reportStatusLabels } from "./report-presentation";
import { ResidentReviewExpectation } from "./resident-review-expectation";
import { reviewCopy } from "./review-copy";

export function ResidentReportList({ reports: initialReports, nextCursor: initialCursor = null }: { reports: ResidentReport[]; nextCursor?: string | null }) {
  const { locale } = useLocale();
  const fil = locale === "fil";
  const [reports, setReports] = useState(initialReports);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function older() {
    if (pending || !nextCursor) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/reports?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const page = await response.json();
      setReports(current => [...new Map([...current, ...page.reports].map(report => [report.reference, report])).values()]);
      setNextCursor(page.nextCursor);
    } catch { setError(fil ? "Hindi ma-load ang mas lumang ulat. Suriin ang koneksyon at subukang muli." : "Could not load older reports. Check your connection and retry."); }
    finally { setPending(false); }
  }
  return <main className="reports-page">
    <header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account">{fil ? "Aking account" : "Account"}</Link></header>
    <section className="reports-shell">
      <div className="section-heading"><div><h1>{fil ? "Aking mga ulat" : "My reports"}</h1></div><Link className="button button-primary" href="/reports/new">{fil ? "Bagong ulat" : "New report"}</Link></div>
      <p>{reviewCopy[locale].target}</p>
      {reports.length === 0 ? <div className="empty-state"><h2>{fil ? "Wala pang ulat" : "No reports yet"}</h2><p>{fil ? "Magsimula sa isang hindi emergency na concern sa komunidad." : "Start with a non-emergency community concern."}</p></div> : <div className="report-grid">{reports.map(report => <Link className="report-card report-card-link" href={`/reports/${report.reference}`} key={report.reference}><div className="report-card__topline"><span className="eyebrow">{reportCategoryLabels[locale][report.category]}</span><span className="status status-review">{reportStatusLabels[locale][report.status]}</span></div><h2>{report.description}</h2><ResidentReviewExpectation report={report} locale={locale} /><p className="report-place">{report.nearbyLandmark}</p><footer><span>{report.reference}</span><time dateTime={report.submittedAt}>{formatManilaDate(report.submittedAt, locale)}</time></footer></Link>)}</div>}
      <p role="status" aria-live="polite">{pending ? (fil ? "Nilo-load ang mas lumang ulat…" : "Loading older reports…") : (fil ? `${reports.length} ulat ang naka-load.` : `${reports.length} reports loaded.`)}</p>
      {error && <p role="alert">{error}</p>}
      {nextCursor && <button className="button button-quiet" disabled={pending} type="button" onClick={() => void older()}>{fil ? "Mas lumang mga ulat" : "Older reports"}</button>}
    </section>
  </main>;
}
