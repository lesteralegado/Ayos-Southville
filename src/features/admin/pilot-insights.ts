import type { ModerationStatus } from "@/features/reports/moderation-module";
import type { ReportCategory } from "@/features/reports/report-module";
import { publicStatuses } from "@/features/reports/public-projection";
export type InsightReport = { category: ReportCategory; status: ModerationStatus; submittedAt: string; publicArea: string; timeline: Array<{ status: ModerationStatus; occurredAt: string }> };
export type PilotInsights = { totals: { all: number; byCategory: Partial<Record<ReportCategory, number>>; byStatus: Partial<Record<ModerationStatus, number>> }; medianFirstResponseHours: number | null; medianResolutionHours: number | null; recurringAreas: Array<{ area: string; reports: number }>; residentConfirmed: number };
function median(values: number[]) {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function createPilotInsights(reports: InsightReport[], { recurringAreaThreshold = 3 }: { recurringAreaThreshold?: number } = {}): PilotInsights {
  const publicReports = reports.filter((report) => (publicStatuses as readonly string[]).includes(report.status));
  const byCategory: Partial<Record<ReportCategory, number>> = {}, byStatus: Partial<Record<ModerationStatus, number>> = {};
  const areas = new Map<string, number>(), first: number[] = [], resolution: number[] = [];
  for (const report of publicReports) {
    byCategory[report.category] = (Object.hasOwn(byCategory, report.category) ? byCategory[report.category]! : 0) + 1;
    byStatus[report.status] = (byStatus[report.status] ?? 0) + 1;
    areas.set(report.publicArea, (areas.get(report.publicArea) ?? 0) + 1);
    for (const [status, durations] of [["Under review", first], ["Resolved", resolution]] as const) {
      const times = report.timeline.filter((event) => event.status === status).map((event) =>
        (Date.parse(event.occurredAt) - Date.parse(report.submittedAt)) / 3_600_000
      ).filter((duration) => Number.isFinite(duration) && duration >= 0);
      if (times.length) durations.push(Math.min(...times));
    }
  }
  const threshold = Number.isFinite(recurringAreaThreshold) ? Math.max(3, recurringAreaThreshold) : 3;
  return {
    totals: { all: publicReports.length, byCategory, byStatus },
    medianFirstResponseHours: median(first), medianResolutionHours: median(resolution),
    recurringAreas: [...areas].filter(([, count]) => count >= threshold).map(([area, reports]) => ({ area, reports })).toSorted((a, b) => b.reports - a.reports),
    residentConfirmed: byStatus["Resident confirmed"] ?? 0,
  };
}
