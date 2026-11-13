import type { ModerationStore, QueueReport } from "./moderation-module";
import { pageCursor, pagePosition, ReportPageError, reportPageSize, reportScanSize, type QueueFilter } from "./report-pages";

/** Two bounded lanes: all of this operator's work, followed by other reports. */
export async function ownedReportPage(store: Pick<ModerationStore, "listWindow"> & { listOwnedWindow: NonNullable<ModerationStore["listOwnedWindow"]> }, uid: string, filter: QueueFilter, cursor?: string | null) {
  const scope = `operator:${uid}:${filter}:owned-first`;
  let lane = "owned", position: string | null = null;
  if (cursor) {
    try {
      if (cursor.length > 2048) throw new Error();
      const value = JSON.parse(atob(cursor));
      if (!["owned", "others"].includes(value.lane) || (value.position !== null && typeof value.position !== "string")) throw new Error();
      lane = value.lane; position = value.position;
    } catch { throw new ReportPageError(); }
  }
  const after = pagePosition(`${scope}:${lane}`, position);
  const continuation = (nextLane: string, row?: QueueReport) => btoa(JSON.stringify({ lane: nextLane, position: row ? pageCursor(`${scope}:${nextLane}`, row) : null }));
  if (lane === "owned") {
    const rows = await store.listOwnedWindow(uid, filter, after, reportPageSize + 1);
    if (rows.length) {
      const reports = rows.slice(0, reportPageSize);
      return { reports, nextCursor: rows.length > reportPageSize ? continuation("owned", reports.at(-1)) : continuation("others") };
    }
  }
  const rows = await store.listWindow(filter, lane === "others" ? after : null, reportScanSize + 1);
  const reports: QueueReport[] = [];
  let scanned = 0;
  for (const row of rows.slice(0, reportScanSize)) {
    scanned++; if (row.reviewOwnerUid !== uid) reports.push(row);
    if (reports.length === reportPageSize) break;
  }
  return { reports, nextCursor: scanned && rows.length > scanned ? continuation("others", rows[scanned - 1]) : null };
}
