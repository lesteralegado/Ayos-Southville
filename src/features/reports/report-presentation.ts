import type { Locale } from "@/features/i18n/messages";
import type { ReportCategory, ReportStatus } from "./report-module";

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
  return reportStatusLabels[locale][status];
}
