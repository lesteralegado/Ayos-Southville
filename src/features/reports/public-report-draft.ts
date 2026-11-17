import type { ModerationReport } from "./moderation-module";
import { reviewedReportSource } from "./report-clarification";

/** A private starting point for operator review, never an approved public projection. */
export function preparePublicDraft(source: Pick<ModerationReport, "description" | "nearbyLandmark" | "exactLocation" | "clarifications">) {
  const report = reviewedReportSource(source);
  return { summary: report.description.trim(), area: report.nearbyLandmark.trim(),
    latitude: report.exactLocation ? String(report.exactLocation.latitude) : "",
    longitude: report.exactLocation ? String(report.exactLocation.longitude) : "",
  };
}
