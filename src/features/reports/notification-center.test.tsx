import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { NotificationCenter } from "./notification-center";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it("does not restore a withdrawn notification from a stale in-flight response", async () => {
  let complete!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("summary") ? Promise.resolve(Response.json({ unreadCount: 0 })) : new Promise<Response>(resolve => { complete = resolve; })));
  render(<NotificationCenter embedded />);
  await act(async () => { await Promise.resolve(); });
  act(() => window.dispatchEvent(new CustomEvent("ayos-report-withdrawn", { detail: { reference: "AS-WITHDRAWN" } })));
  await act(async () => complete(Response.json({ notifications: [{ id: "notice", residentUid: "resident", reference: "AS-WITHDRAWN", kind: "report-update", message: "Stale submission notification", createdAt: "2026-11-12T00:00:00Z", read: false }], preferences: { emailEnabled: false, statusUpdates: true, followUpdates: true }, unreadCount: 1 })));
  expect(screen.queryByText("Stale submission notification")).not.toBeInTheDocument();
  expect(screen.getByText(/No notifications yet/)).toBeInTheDocument();
});
it("shows a recoverable load failure instead of claiming an empty inbox", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValue(new Response(JSON.stringify({ notifications: [], preferences: { emailEnabled: false, statusUpdates: true, followUpdates: true } }))));
  render(<NotificationCenter />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not");
  expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reload notifications" }));
  expect(await screen.findByText(/No notifications yet/)).toBeInTheDocument();
});
