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
