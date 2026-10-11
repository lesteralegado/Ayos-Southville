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

export function ReportDetail({
  report,
  privateReceipt = false,
}: {
  report: PublicReportDetail;
  privateReceipt?: boolean;
}) {
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
        {report.media.length > 0 && (
          <section
            aria-label={fil ? "Aprubadong mga litrato" : "Approved photos"}
            className="evidence-previews"
          >
            {report.media.map((asset) => (
              <figure key={asset.id}>
                {/* Only individually approved media is served from this public boundary. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={"/api/public-evidence/" + asset.id} alt={asset.alt} />
                <figcaption>{asset.alt}</figcaption>
              </figure>
            ))}
          </section>
        )}
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
        {privateReceipt ? (
          <p>
            {fil
              ? "Pribadong resibo. Sa iyo at awtorisadong operator lamang nakikita ang ulat hanggang aprubahan."
              : "Private receipt. Only you and authorized operators can view this report until it is approved."}
          </p>
        ) : (
          <ReportEngagement reference={report.reference} />
        )}
      </article>
    </main>
  );
}
