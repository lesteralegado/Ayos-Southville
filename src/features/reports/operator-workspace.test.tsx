import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { OperatorWorkspace } from "./operator-workspace";
import type { ModerationReport } from "./moderation-module";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
const report: ModerationReport = {
  reference: "AS-300001",
  reporterUid: "resident",
  category: "streetlights",
  description: "Private light description",
  nearbyLandmark: "Court",
  exactLocation: {
    latitude: 14.281,
    longitude: 121.127,
    privateDetails: "Block 9 Lot 12",
  },
  evidence: [],
  status: "Assigned",
  submittedAt: "2026-10-10T02:00:00Z",
  revision: 1,
  public: { summary: "Broken light", area: "Court", media: [] },
  followers: [],
  affectedResidents: [],
  supportingEvidence: [],
  history: [],
};
it("names a recorded takeover without pretending the report changed lifecycle status", () => {
  render(<OperatorWorkspace initialReports={[{ ...report, status: "Submitted", history: [{ action: "review-takeover", status: "Submitted", occurredAt: "2026-10-14T11:00:01Z" }] }]} actor={{ uid: "operator", roles: ["Coordinator"] }} destinations={[]} />);
  expect(screen.getAllByText("Backup review responsibility accepted").some(element => element.tagName === "STRONG")).toBe(true);
});
it("preserves input and offers refresh when an operator encounters a stale report", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "CONFLICT",
            error:
              "This report changed. Reload the latest report and try again.",
          }),
          { status: 409 },
        ),
      ),
  );
  render(
    <OperatorWorkspace
      initialReports={[report]}
      actor={{ uid: "operator", roles: ["Coordinator"] }}
      destinations={[]}
    />,
  );
  fireEvent.change(screen.getByLabelText("English update"), {
    target: { value: "Work has started." },
  });
  fireEvent.change(screen.getByLabelText("Filipino update"), {
    target: { value: "Nagsimula ang gawain." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start work" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This report changed",
  );
  expect(screen.getByLabelText("English update")).toHaveValue(
    "Work has started.",
  );
  expect(
    screen.getByRole("button", { name: "Reload workspace" }),
  ).toBeInTheDocument();
});
it("retains an edited public draft and photo choices across conflict recovery to a newer revision", async () => {
  const submitted = { ...report, status: "Submitted" as const, evidence: [{ id: "photo-1", name: "light.jpg", type: "image/jpeg" as const, size: 100, visibility: "restricted" as const }] };
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PATCH") return Response.json({ code: "CONFLICT", error: "This report changed." }, { status: 409 });
    if (url.includes("reference=")) return Response.json({ report: { ...submitted, revision: 2 } });
    return Response.json({ reports: [{ ...submitted, revision: 2 }], nextCursor: null });
  }));
  render(<OperatorWorkspace initialReports={[submitted]} actor={{ uid: "operator", roles: ["Administrator"] }} destinations={[]} />);
  fireEvent.click(screen.getByText("Edit public details"));
  fireEvent.change(screen.getByLabelText("Public summary"), { target: { value: "Edited safe summary." } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Approve photo 1" }));
  fireEvent.change(screen.getByLabelText("Alternative text for photo 1"), { target: { value: "Reviewed light." } });
  fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Latest reports loaded. Review the current state before retrying.");
  expect(screen.getByLabelText("Public summary")).toHaveValue("Edited safe summary.");
  expect(screen.getByRole("checkbox", { name: "Approve photo 1" })).toBeChecked();
  expect(screen.getByLabelText("Alternative text for photo 1")).toHaveValue("Reviewed light.");
});
