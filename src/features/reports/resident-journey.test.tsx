import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { ResidentReportList } from "./resident-report-list";
import type { ResidentReport } from "./report-module";
const report: ResidentReport = { reference: "AS-PRIVATE", reporterUid: "resident", category: "streetlights", description: "The light beside the court is broken.", nearbyLandmark: "Court", evidence: [], status: "Submitted", submittedAt: "2026-11-12T00:00:00Z" };
const preferences = { emailEnabled: false, statusUpdates: true, followUpdates: true };
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("keeps a failed withdrawal recoverable and removes the report only after server confirmation", async () => {
  let fail = true;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("/request") ? fail ? new Response("{}", { status: 503 }) : Response.json({ status: "complete" }) : Response.json({ notifications: [], preferences })));
  render(<ResidentReportList reports={[report]} />);
  await screen.findByText(/No notifications yet/);
  fireEvent.click(screen.getByText("Withdraw report", { selector: "summary" }));
  fireEvent.click(screen.getByLabelText("I understand and want to continue"));
  fireEvent.click(screen.getByRole("button", { name: "Withdraw report" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
  expect(screen.getByRole("heading", { name: report.description })).toBeInTheDocument();
  expect(screen.getByLabelText("I understand and want to continue")).toBeChecked();
  fail = false; fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: report.description })).not.toBeInTheDocument());
  expect(screen.getByText("Report withdrawn.")).toBeInTheDocument();
});
it("pages reports and updates independently and marks an older update read", async () => {
  let read = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url.startsWith("/api/reports?")) return Response.json({ reports: [{ ...report, reference: "AS-OLDER", description: "An older concern near the court." }], nextCursor: null });
    if (options?.method === "PATCH") { read = true; return Response.json({ ok: true }); }
    return Response.json({ notifications: [{ id: url.includes("cursor=") ? "older" : "recent", reference: report.reference, residentUid: "resident", kind: "report-update", message: url.includes("cursor=") ? "Older update" : "Recent update", createdAt: report.submittedAt, read: read && url.includes("cursor=") }], preferences, nextCursor: url.includes("cursor=") ? null : "next", unreadCount: read ? 1 : 2 });
  }));
  render(<ResidentReportList reports={[report]} nextCursor="reports-next" />);
  await screen.findByText("Recent update");
  fireEvent.click(screen.getByRole("button", { name: "Older reports" }));
  expect(await screen.findByRole("heading", { name: "An older concern near the court." })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Older updates" }));
  const older = await screen.findByText("Older update");
  fireEvent.click(within(older.closest("li")!).getByRole("button", { name: "Mark read" }));
  await waitFor(() => expect(within(older.closest("li")!).getByText("Read")).toBeInTheDocument());
  expect(screen.getByText("Recent update")).toBeInTheDocument();
});
