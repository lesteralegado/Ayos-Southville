import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ReportDetail } from "./report-detail";
import type { PublicReportDetail, ResidentReport } from "./report-module";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./report-engagement", () => ({ ReportEngagement: () => null }));
const report: PublicReportDetail = { reference: "AS-PROGRESS", category: "streetlights", publicSummary: "Broken light", publicArea: "Court", status: "Resolved", submittedAt: "2026-11-17T00:00:00Z", media: [], timeline: [{ status: "Under review", occurredAt: "2026-11-17T01:00:00Z" }, { status: "Resolved", occurredAt: "2026-11-17T02:00:00Z" }] };
const owned: ResidentReport = { ...report, reporterUid: "resident", description: "Original private concern", nearbyLandmark: "Court", evidence: [] };
beforeEach(() => localStorage.clear());
it("shows the three steps and preserves owner confirmation choices and historical dates", () => {
  render(<ReportDetail report={report} ownedReport={owned} canRespond />);
  expect(screen.getByRole("list", { name: "Report progress" }).children).toHaveLength(3);
  expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Resolved");
  expect(screen.getByText("Awaiting your confirmation")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirmed fixed" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Still a problem" })).toBeInTheDocument();
  expect(screen.getByText("Under review")).toBeInTheDocument();
  expect(document.querySelector('time[datetime="2026-11-17T02:00:00Z"]')).toBeInTheDocument();
});
it("does not expose private waiting context in a public detail", () => {
  render(<ReportDetail report={{ ...report, status: "Under review" }} />);
  expect(screen.getByText("Published")).toBeInTheDocument();
  expect(screen.queryByText("More information needed")).not.toBeInTheDocument();
  expect(screen.queryByText("Original private concern")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirmed fixed" })).not.toBeInTheDocument();
});
it("does not draw a repair progression for an archived report", () => {
  render(<ReportDetail report={report} privateReceipt archived ownedReport={{ ...owned, archivedAt: "2026-11-17T03:00:00Z" }} />);
  expect(screen.getByText("Archived")).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Report progress" })).not.toBeInTheDocument();
});
