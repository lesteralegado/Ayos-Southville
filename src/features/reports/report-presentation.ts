import type { Locale } from "@/features/i18n/messages";
import type { ReportCategory, ReportStatus, ResidentReport, PublicReportDetail } from "./report-module";
import { resolutionOutcomeUpdate } from "./resolution-copy";
import { canClarifyReport, pendingClarification } from "./report-clarification";

export const reportCategoryLabels: Record<Locale, Record<ReportCategory, string>> = {
  en: { "roads-drainage": "Roads and drainage", streetlights: "Broken streetlight", "waste-collection": "Waste collection" },
  fil: { "roads-drainage": "Kalsada at kanal", streetlights: "Sirang ilaw sa kalsada", "waste-collection": "Koleksyon ng basura" },
};

export const reportStatusLabels: Record<Locale, Record<ReportStatus, string>> = {
  en: { Submitted: "Submitted", "Under review": "Under review", Assigned: "Assigned", "In progress": "In progress", Resolved: "Resolved", "Resident confirmed": "Resident confirmed", Rejected: "Rejected", Duplicate: "Duplicate" },
  fil: { Submitted: "Isinumite", "Under review": "Sinusuri", Assigned: "Itinalaga", "In progress": "Isinasagawa", Resolved: "Nalutas", "Resident confirmed": "Kinumpirma ng residente", Rejected: "Tinanggihan", Duplicate: "Duplikado" },
};

export function formatManilaDate(value: string, locale: Locale, includeTime = false) {
  return new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : "en-PH", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function reportStatusLabel(status: ReportStatus, locale: Locale) {
  if (status === "Under review") return reportStatusLabels[locale].Submitted;
  if (status === "Assigned") return reportStatusLabels[locale]["In progress"];
  if (status === "Resident confirmed") return reportStatusLabels[locale].Resolved;
  return reportStatusLabels[locale][status];
}

export function publicTimelineLabel(event: { status: ReportStatus; update?: { en: string; fil: string } }, locale: Locale) {
  if (event.status === "Under review" && event.update?.en === resolutionOutcomeUpdate.dispute.en) return locale === "fil" ? "May problema pa rin" : "Still a problem";
  if (event.status === "Resident confirmed") return locale === "fil" ? "Kinumpirmang ayos na" : "Confirmed fixed";
  return reportStatusLabels[locale][event.status];
}

type ProgressReport = Pick<ResidentReport, "status"> & Partial<Pick<ResidentReport, "archivedAt" | "removalRequestedAt" | "history" | "clarifications">> & Partial<Pick<PublicReportDetail, "timeline">>;

/** Private context is considered only at an established ownership boundary. */
export function reportProgress(report: ProgressReport, locale: Locale, owner = false) {
  const t = (en: string, fil: string) => locale === "fil" ? fil : en;
  if (owner && report.archivedAt) return { label: t("Archived", "Naka-archive"), step: null, context: [] as string[] };
  const status = report.status;
  const step = status === "Rejected" || status === "Duplicate" ? null : status === "Resolved" || status === "Resident confirmed" ? 2 : status === "Assigned" || status === "In progress" ? 1 : 0;
  const context: string[] = [];
  if (status === "Submitted") context.push(t("Awaiting review", "Naghihintay ng pagsusuri"));
  if (status === "Under review") context.push(t("Published", "Nailathala"));
  if (status === "Resolved") context.push(owner ? t("Awaiting your confirmation", "Naghihintay ng iyong kumpirmasyon") : t("Awaiting resident confirmation", "Naghihintay ng kumpirmasyon ng residente"));
  if (status === "Resident confirmed") context.push(t("Confirmed fixed", "Kinumpirmang ayos na"));
  const events = owner && report.history?.length ? report.history : report.timeline;
  if (status === "Under review") {
    for (const event of [...(events ?? [])].reverse()) {
      if (event.status && event.status !== "Under review") break;
      if (event.update?.en === resolutionOutcomeUpdate.dispute.en) {
        context.push(t("Still a problem · Under review", "May problema pa rin · Sinusuri"));
        break;
      }
    }
  }
  if (owner) {
    const request = canClarifyReport(report) ? pendingClarification(report) : undefined;
    if (request) context.push(request.response ? t("Your response is awaiting operator review.", "Naghihintay ng pagsusuri ng operator ang iyong sagot.") : t("More information needed", "Kailangan ng dagdag na impormasyon"));
    if (report.removalRequestedAt) context.push(t("Archive requested", "Hiniling ang pag-archive"));
    if (step === null) {
      const outcome = report.history?.filter(event => status === "Rejected" ? event.action.startsWith("rejected:") : event.action.startsWith("merged-into:")).at(-1);
      if (outcome?.reason) context.push(outcome.reason);
    }
  }
  return { label: reportStatusLabel(status, locale), step, context };
}

export function presentUpdate(update: { en: string; fil: string }, locale: Locale) {
  const lang = update[locale]?.trim() ? locale : locale === "en" ? "fil" : "en";
  return { text: update[lang], lang, label: lang === "en" ? "English" : "Filipino" };
}
