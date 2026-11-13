import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { PrimaryReportAction } from "./primary-report-action";
import type { ModerationReport, OperatorRole } from "./moderation-module";
const report: ModerationReport = { reference: "AS-PUBLISH", reporterUid: "resident", category: "streetlights", description: "The streetlight beside the court is broken.", nearbyLandmark: "Covered court", evidence: [{ id: "photo", name: "private.jpg", type: "image/jpeg", size: 20, visibility: "restricted" }], status: "Submitted", submittedAt: "2026-11-12T00:00:00Z", public: { summary: "", area: "", media: [] }, followers: [], affectedResidents: [], supportingEvidence: [], history: [] };
it("prefills an editable draft and submits only explicitly selected photos", async () => {
  const mutate = vi.fn().mockResolvedValue(undefined);
  render(<PrimaryReportAction report={report} actor={{ uid: "moderator", roles: ["Moderator"] }} locale="en" pending={false} mutate={mutate} />);
  expect(screen.getByLabelText("Public summary")).toHaveValue(report.description);
  expect(screen.getByLabelText("Public area")).toHaveValue("Covered court");
  expect(screen.getByRole("checkbox", { name: "Approve photo 1" })).not.toBeChecked();
  fireEvent.click(screen.getByText("Edit public details"));
  fireEvent.change(screen.getByLabelText("Public summary"), { target: { value: "Reviewed light concern." } });
  fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));
  await waitFor(() => expect(mutate).toHaveBeenCalledWith("accept", expect.objectContaining({ publicSummary: "Reviewed light concern.", publicArea: "Covered court", approvedMedia: [] })));
});
it.each([
  ["Moderator", "Submitted", "Approve and publish"], ["Coordinator", "Submitted", null],
  ["Moderator", "Under review", null], ["Coordinator", "Under review", "Start work"],
  ["Administrator", "Assigned", "Start work"], ["Resident", "Submitted", null],
] as const)("exposes the permitted primary action for %s in %s", (role, status, label) => {
  render(<PrimaryReportAction report={{ ...report, status }} actor={{ uid: "operator", roles: [role as OperatorRole] }} locale="en" pending={false} mutate={vi.fn()} />);
  expect(screen.queryByRole("button")?.textContent ?? null).toBe(label);
});
