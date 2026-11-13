import type { ModerationReport } from "./moderation-module";

/** A private starting point for operator review, never an approved public projection. */
export function preparePublicDraft(report: Pick<ModerationReport, "description" | "nearbyLandmark" | "exactLocation">) {
  return { summary: report.description.trim(), area: report.nearbyLandmark.trim(),
    latitude: report.exactLocation ? report.exactLocation.latitude.toFixed(2) : "",
    longitude: report.exactLocation ? report.exactLocation.longitude.toFixed(2) : "",
  };
}
