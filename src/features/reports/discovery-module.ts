import { publicProjection, publicStatuses, type DiscoveryMode } from "./public-projection";

export const discoveryLimit = 500;
export const discoveryPageSize = 20;
export class DiscoveryError extends Error {
  constructor(readonly code: "VALIDATION" | "CAPACITY" | "UNAVAILABLE", readonly status: number) { super(code); }
}
export function createDiscoveryModule({ read, mode = "live", now = () => new Date() }: { read: () => Promise<unknown[]>; mode?: DiscoveryMode; now?: () => Date }) {
  async function all() {
    const records = await read();
    if (records.length > discoveryLimit) throw new DiscoveryError("CAPACITY", 503);
    return records.flatMap((value) => { const report = publicProjection(value, mode); return report ? [report] : []; });
  }
  return { all, async list(params: URLSearchParams) {
    const category = params.get("category") ?? "all", status = params.get("status") ?? "all";
    const days = params.get("date") ?? "all", distance = params.get("distance") ?? "all";
    const requestedPage = params.get("page") ?? "1";
    if (!/^(all|[a-z0-9-]{1,80})$/.test(category) ||
        (status !== "all" && !publicStatuses.includes(status as typeof publicStatuses[number])) ||
        !["all", "7", "30"].includes(days) || !["all", "1", "3"].includes(distance) ||
        !/^[1-9][0-9]{0,2}$/.test(requestedPage) ||
        (params.has("view") && !["list", "map"].includes(params.get("view")!)))
      throw new DiscoveryError("VALIDATION", 422);
    const timestamp = now().getTime();
    const filtered = (await all()).filter((report) =>
      (category === "all" || report.category === category) &&
      (status === "all" || report.status === status) &&
      (days === "all" || Date.parse(report.submittedAt) >= timestamp - Number(days) * 86_400_000) &&
      (distance === "all" || (report.publicLocation && Math.hypot(
        (report.publicLocation.latitude - 14.281) * 111,
        (report.publicLocation.longitude - 121.127) * 107) <= Number(distance)))
    ).toSorted((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt) || a.reference.localeCompare(b.reference));
    const pages = Math.max(1, Math.ceil(filtered.length / discoveryPageSize));
    const page = Math.min(Number(requestedPage), pages);
    const reports = filtered.slice((page - 1) * discoveryPageSize, page * discoveryPageSize);
    return { reports, total: filtered.length, mode, page, pages };
  } };
}

export type DiscoveryResult = Awaited<ReturnType<ReturnType<typeof createDiscoveryModule>["list"]>>;
