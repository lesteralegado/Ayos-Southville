"use client";

import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";
import type { PublicReportDetail } from "./report-module";
import {
  formatManilaDate,
  reportCategoryLabels,
  reportStatusLabels,
} from "./report-presentation";
import { ReportEngagement } from "./report-engagement";
import { ResolutionResponse } from "./resolution-response";

export function ReportDetail({ report }: { report: PublicReportDetail }) {
  const { locale } = useLocale();
  const fil = locale === "fil";
  return (
    <main className="detail-page">
      <header className="composer-header">
        <Link className="brand" href="/">
          Ayos Southville
        </Link>
        <Link className="text-link" href="/account/reports">
          {fil ? "Aking mga ulat" : "My reports"}
        </Link>
      </header>
      <article className="detail-card">
        <div className="receipt-banner">
          <strong>{fil ? "Reference ng ulat" : "Report reference"}</strong>
          <span>{report.reference}</span>
        </div>
        <div className="report-card__topline">
          <span>
            {reportCategoryLabels[locale][report.category] ??
              (fil ? "Ulat ng komunidad" : "Community report")}
          </span>
          <span className="status status-review">
            {reportStatusLabels[locale][report.status]}
          </span>
        </div>
        <h1>{report.publicSummary}</h1>
        <p className="report-place">
          <span aria-hidden="true">⌖</span>
          {report.publicArea}
        </p>
        <dl className="report-meta">
          <div>
            <dt>Reference</dt>
            <dd>{report.reference}</dd>
          </div>
          <div>
            <dt>{fil ? "Isinumite" : "Submitted"}</dt>
            <dd>{formatManilaDate(report.submittedAt, locale, true)}</dd>
          </div>
        </dl>
        <section className="timeline" aria-labelledby="timeline-title">
          <h2 id="timeline-title">Timeline</h2>
          <ol>
            {report.timeline.map((event) => (
              <li key={`${event.status}-${event.occurredAt}`}>
                <span className="timeline-dot" />
                <div>
                  <strong>{reportStatusLabels[locale][event.status]}</strong>
                  {event.update && (
                    <p>{fil ? event.update.fil : event.update.en}</p>
                  )}
                  <time dateTime={event.occurredAt}>
                    {formatManilaDate(event.occurredAt, locale, true)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>
        {report.status === "Resolved" && (
          <ResolutionResponse reference={report.reference} fil={fil} />
        )}
        <ReportEngagement reference={report.reference} />
      </article>
    </main>
  );
}
