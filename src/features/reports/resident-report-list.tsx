"use client";

import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";
import type { ResidentReport } from "./report-module";
import { formatManilaDate, reportCategoryLabels, reportStatusLabels } from "./report-presentation";
import { ResidentReviewExpectation } from "./resident-review-expectation";
import { reviewCopy } from "./review-copy";

export function ResidentReportList({ reports }: { reports: ResidentReport[] }) {
  const { locale } = useLocale();
  const fil = locale === "fil";
  return <main className="reports-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account">Account</Link></header><section className="reports-shell"><div className="section-heading"><div><h1>{fil ? "Aking mga ulat" : "My reports"}</h1></div><Link className="button button-primary" href="/reports/new">{fil ? "Bagong ulat" : "New report"}</Link></div><p>{reviewCopy[locale].target}</p>{reports.length === 0 ? <div className="empty-state"><h2>{fil ? "Wala pang ulat" : "No reports yet"}</h2><p>{fil ? "Magsimula sa isang hindi emergency na concern sa komunidad." : "Start with a non-emergency community concern."}</p></div> : <div className="report-grid">{reports.map((report) => <Link className="report-card report-card-link" href={`/reports/${report.reference}`} key={report.reference}><div className="report-card__topline"><span className="eyebrow">{reportCategoryLabels[locale][report.category]}</span><span className="status status-review">{reportStatusLabels[locale][report.status]}</span></div><h2>{report.description}</h2><ResidentReviewExpectation report={report} locale={locale} /><p className="report-place">{report.nearbyLandmark}</p><footer><span>{report.reference}</span><time dateTime={report.submittedAt}>{formatManilaDate(report.submittedAt, locale)}</time></footer></Link>)}</div>}</section></main>;
}
