import { render, screen } from "@testing-library/react";
import { ResidentReportList } from "./resident-report-list";
it("shows a resident review target and distinguishes review from repair", () => {
  render(<ResidentReportList reports={[{ reference: "AS-REVIEW", reporterUid: "synthetic", category: "streetlights", description: "A private report", nearbyLandmark: "Court", evidence: [], status: "Submitted", submittedAt: "2026-10-12T01:00:00Z", reviewExpectation: { dueAt: "2026-10-14T11:00:00.000Z", acknowledgedAt: null } }]} />);
  expect(screen.getByText(/acknowledgement and a next-step decision, not a repair/)).toBeInTheDocument();
  expect(screen.getByText("Review target")).toBeInTheDocument();
  expect(document.querySelector('time[datetime="2026-10-14T11:00:00.000Z"]')).toBeInTheDocument();
});
