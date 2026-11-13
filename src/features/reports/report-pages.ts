import type { ReportStatus } from "./report-module";

export const reportPageSize = 20;
export const reportScanSize = 100;
export type PagePosition = { submittedAt: string; reference: string };
export type ReportPage<T> = { reports: T[]; nextCursor: string | null };
export const activeReportStatuses: ReportStatus[] = ["Submitted", "Under review", "Assigned", "In progress"];
export const queueFilters = ["new", "working", "waiting", "closed", "active", "all", "overdue", "canonical", ...activeReportStatuses, "Resolved", "Resident confirmed", "Rejected", "Duplicate"] as const;
export type QueueFilter = typeof queueFilters[number];
export class ReportPageError extends Error {
  readonly code = "VALIDATION";
  constructor() { super("Invalid report page. Reload the list from its beginning."); }
}
export function queueFilter(value: unknown): QueueFilter {
  if (value === undefined || value === null) return "active";
  if (typeof value !== "string" || !(queueFilters as readonly string[]).includes(value)) throw new ReportPageError();
  return value as QueueFilter;
}
export function filterStatuses(filter: QueueFilter): readonly ReportStatus[] | null {
  if (filter === "new") return ["Submitted"];
  if (filter === "working") return ["Under review", "Assigned", "In progress"];
  if (filter === "waiting") return ["Resolved"];
  if (filter === "closed") return ["Resident confirmed", "Rejected", "Duplicate"];
  return filter === "all" ? null : filter === "active" || filter === "overdue" ? activeReportStatuses : filter === "canonical" ? ["Under review", "Assigned", "In progress"] : [filter];
}
export function pageCursor(scope: string, position: PagePosition): string {
  return btoa(JSON.stringify({ version: 1, scope, submittedAt: position.submittedAt, reference: position.reference }).replace(/[\u007f-\uffff]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export function pagePosition(scope: string, cursor?: string | null): PagePosition | null {
  if (!cursor) return null;
  try {
    if (cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
    const value = JSON.parse(atob(cursor.replaceAll("-", "+").replaceAll("_", "/")));
    if (value.version !== 1 || value.scope !== scope || typeof value.submittedAt !== "string" || !Number.isFinite(Date.parse(value.submittedAt)) || typeof value.reference !== "string" || !/^AS-[A-Z0-9]{1,76}$/.test(value.reference)) throw new Error();
    return { submittedAt: value.submittedAt, reference: value.reference };
  } catch { throw new ReportPageError(); }
}
export function compareReports(left: PagePosition, right: PagePosition) {
  return right.submittedAt.localeCompare(left.submittedAt) || right.reference.localeCompare(left.reference);
}
export function memoryWindow<T extends PagePosition>(reports: T[], after: PagePosition | null, limit: number): T[] {
  return reports.toSorted(compareReports).filter(report => !after || compareReports(report, after) > 0).slice(0, limit);
}
