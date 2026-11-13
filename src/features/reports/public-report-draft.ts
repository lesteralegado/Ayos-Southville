import type { ModerationReport } from "./moderation-module";

/** A private starting point for operator review, never an approved public projection. */
export function preparePublicDraft(report: Pick<ModerationReport, "description" | "nearbyLandmark" | "exactLocation">) {
  return { summary: report.description.trim(), area: report.nearbyLandmark.trim(),
    latitude: report.exactLocation ? String(report.exactLocation.latitude) : "",
    longitude: report.exactLocation ? String(report.exactLocation.longitude) : "",
  };
}
