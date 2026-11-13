import type { Locale } from "@/features/i18n/messages";
import type { ReportCategory, ReportStatus } from "./report-module";
import { resolutionOutcomeUpdate } from "./resolution-copy";

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
  if (status === "Assigned") return reportStatusLabels[locale]["In progress"];
  if (status === "Resident confirmed") return locale === "fil" ? "Kinumpirmang ayos na" : "Confirmed fixed";
  return reportStatusLabels[locale][status];
}

export function publicTimelineLabel(event: { status: ReportStatus; update?: { en: string; fil: string } }, locale: Locale) {
  if (event.status === "Under review" && event.update?.en === resolutionOutcomeUpdate.dispute.en) return locale === "fil" ? "May problema pa rin" : "Still a problem";
  return reportStatusLabel(event.status, locale);
}

export function presentUpdate(update: { en: string; fil: string }, locale: Locale) {
  const lang = update[locale]?.trim() ? locale : locale === "en" ? "fil" : "en";
  return { text: update[lang], lang, label: lang === "en" ? "English" : "Filipino" };
}
