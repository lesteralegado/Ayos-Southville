import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyWorkspace } from "./privacy-workspace";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it("associates rejected pilot-end validation with the date field", async () => {
  vi.stubGlobal("fetch", async (_url: string, input?: RequestInit) => input?.method
    ? Response.json({ code: "VALIDATION" }, { status: 422 }) : Response.json({ requests: [], runs: [], pilotEndedAt: null }));
  render(<PrivacyWorkspace mode="administrator" />);
  await screen.findByText("No requests to review. Residents can request deletion from their privacy page.");
  const user = userEvent.setup(), date = screen.getByLabelText("Pilot end date");
  await user.type(date, "2099-01-01"); await user.click(screen.getByLabelText(/I confirm the pilot has ended/));
  await user.click(screen.getByRole("button", { name: "Record end and stop participation" }));
  await screen.findByRole("alert");
  expect(date).toHaveAttribute("aria-invalid", "true");
  expect(date).toHaveAttribute("aria-describedby", "pilot-end-help privacy-error");
});
it("preserves deletion confirmation through an offline failure and confirms only the server receipt", async () => {
  let online = false;
  vi.stubGlobal("fetch", async (_url: string, input?: RequestInit) => {
    if (!input?.method) return Response.json({ request: null });
    if (!online) throw new TypeError("Offline");
    return Response.json({ request: { id: "request-1", status: "requested", requestedAt: "2026-10-11T00:00:00Z" } });
  });
  render(<PrivacyWorkspace mode="resident" />);
  const user = userEvent.setup();
  const submit = await screen.findByRole("button", { name: "Request account and data deletion" });
  expect(submit).toBeDisabled();
  await user.click(screen.getByLabelText(/I understand/)); await user.click(submit);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not be confirmed/);
  expect(screen.getByLabelText(/I understand/)).toBeChecked();
  online = true; await user.click(submit);
  expect(await screen.findByText("Requested", { exact: true })).toBeInTheDocument();
});
