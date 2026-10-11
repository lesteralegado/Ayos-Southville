import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { NotificationCenter } from "./notification-center";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it("shows a recoverable load failure instead of claiming an empty inbox", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValue(new Response(JSON.stringify({ notifications: [], preferences: { emailEnabled: false, statusUpdates: true, followUpdates: true } }))));
  render(<NotificationCenter />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not");
  expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reload notifications" }));
  expect(await screen.findByText(/No notifications yet/)).toBeInTheDocument();
});
