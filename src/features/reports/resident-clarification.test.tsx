import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { ResidentClarification } from "./resident-clarification";
import type { ResidentReport } from "./report-module";
const report: ResidentReport = { reference: "AS-CLARIFY", reporterUid: "resident", revision: 1, category: "streetlights", description: "Original concern", nearbyLandmark: "Court", status: "Submitted", submittedAt: "2026-11-13T00:00:00Z", evidence: [], clarifications: [{ id: "question-1", question: "Which entrance?", actorUid: "operator", occurredAt: "2026-11-13T01:00:00Z", revision: 0 }] };
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
it("keeps a failed response and retries the identical operation after a lost acknowledgement", async () => {
  const bodies: string[] = [];
  vi.stubGlobal("fetch", async (_url: string, options: RequestInit) => { bodies.push(String(options.body)); if (bodies.length === 1) throw new TypeError("Lost acknowledgement"); return Response.json({ ok: true }); });
  const user = userEvent.setup();
  render(<ResidentClarification report={report} />);
  await user.type(screen.getByLabelText("Your explanation"), "The north entrance");
  await user.click(screen.getByRole("button", { name: "Send response" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Your explanation")).toHaveValue("The north entrance");
  await user.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Your response is awaiting operator review.");
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toBe(bodies[1]);
});
it("keeps obsolete questions out of resolved and archived report actions", () => {
  const { rerender } = render(<ResidentClarification report={{ ...report, status: "Resolved" }} />);
  expect(screen.queryByRole("button", { name: "Send response" })).not.toBeInTheDocument();
  rerender(<ResidentClarification report={{ ...report, archivedAt: "2026-11-13T02:00:00Z" }} />);
  expect(screen.queryByText("Which entrance?")).not.toBeInTheDocument();
});
it("keeps entered text visible after a revision conflict", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ code: "CONFLICT" }, { status: 409 }));
  render(<ResidentClarification report={report} />);
  await userEvent.type(screen.getByLabelText("Your explanation"), "North entrance");
  await userEvent.click(screen.getByRole("button", { name: "Send response" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("This report changed"));
  expect(screen.getByLabelText("Your explanation")).toHaveValue("North entrance");
});
