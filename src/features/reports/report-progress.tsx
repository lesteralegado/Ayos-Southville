import type { Locale } from "@/features/i18n/messages";
import type { PublicReportDetail, ResidentReport } from "./report-module";
import { reportProgress, reportStatusLabel } from "./report-presentation";

export function ReportProgress({ report, locale, ownedReport, compact = false, archived = false }: { report: Pick<PublicReportDetail, "status"> & Partial<PublicReportDetail>; locale: Locale; ownedReport?: ResidentReport; compact?: boolean; archived?: boolean }) {
  const progress = archived ? { step: null, context: [] } : reportProgress(ownedReport ?? report, locale, !!ownedReport);
  return <div className="report-progress">
    {!compact && progress.step !== null && <ol aria-label={locale === "fil" ? "Progreso ng ulat" : "Report progress"}>
      {(["Submitted", "In progress", "Resolved"] as const).map((status, index) => <li key={status} aria-current={index === progress.step ? "step" : undefined} data-reached={index <= (progress.step ?? -1)}>{reportStatusLabel(status, locale)}</li>)}
    </ol>}
    {progress.context.map(text => <p key={text}>{text}</p>)}
  </div>;
}
