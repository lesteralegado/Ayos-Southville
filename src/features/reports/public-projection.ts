import type { PublicReportDetail, ReportStatus } from "./report-module";

export const publicStatuses = ["Under review", "Assigned", "In progress", "Resolved", "Resident confirmed"] as const;
export type DiscoveryMode = "live" | "demo";
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : "";
const status = (value: unknown): value is ReportStatus => publicStatuses.includes(value as typeof publicStatuses[number]);

/** Explicit allowlist: never serialize Firestore documents or nested raw objects. */
export function publicProjection(value: unknown, mode: DiscoveryMode = "live"): PublicReportDetail | null {
  const data = object(value);
  const reference = text(data.reference, 80);
  const demonstration = data.demonstration === true || reference.startsWith("DEMO-");
  if (data.approved !== true || demonstration !== (mode === "demo") || !status(data.status) ||
      !/^(AS-[A-Z0-9]+|DEMO-[A-Z0-9]+)$/.test(reference)) return null;
  const submittedAt = date(data.submittedAt);
  const category = text(data.category, 80);
  const publicSummary = text(data.publicSummary, 1000);
  const publicArea = text(data.publicArea, 160);
  if (!submittedAt || !/^[a-z0-9-]{1,80}$/.test(category) || !publicSummary || !publicArea) return null;
  const location = object(data.publicLocation);
  const latitude = location.latitude, longitude = location.longitude;
  const publicLocation = typeof latitude === "number" && typeof longitude === "number" &&
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude: Number(latitude.toFixed(2)), longitude: Number(longitude.toFixed(2)) } : undefined;
  const media = (Array.isArray(data.media) ? data.media : []).slice(0, 5).flatMap((entry) => {
    const asset = object(entry), id = typeof asset.id === "string" ? asset.id : "", alt = text(asset.alt, 400);
    return /^[a-f0-9]{64}$/.test(id) && alt ? [{ id, alt }] : [];
  });
  const timeline = (Array.isArray(data.timeline) ? data.timeline : []).slice(0, 100).flatMap((entry) => {
    const event = object(entry), occurredAt = date(event.occurredAt), update = object(event.update);
    if (!status(event.status) || !occurredAt) return [];
    const en = text(update.en, 1000), fil = text(update.fil, 1000);
    return [{ status: event.status, occurredAt, ...(en || fil ? { update: { en, fil } } : {}) }];
  });
  return { reference, category, publicSummary, publicArea, status: data.status, submittedAt, media, timeline,
    ...(publicLocation ? { publicLocation } : {}),
    ...(Number.isSafeInteger(data.revision) && Number(data.revision) >= 0 ? { revision: Number(data.revision) } : {}) };
}
