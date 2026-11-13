import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { RemovalRequestQueue } from "./removal-request-queue";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("keeps the reason after a failed archive and removes the request only on confirmation", async () => {
  let fail = true;
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "PATCH"
    ? fail ? new Response("{}", { status: 503 }) : Response.json({ status: "archived" })
    : Response.json({ requests: [{ reference: "AS-TEST01", createdAt: "2026-11-12T00:00:00Z" }], nextCursor: null }));
  vi.stubGlobal("fetch", fetcher);
  render(<RemovalRequestQueue />);
  fireEvent.click(screen.getByText("Archive requests", { selector: "summary" }));
  await screen.findByText("AS-TEST01");
  fireEvent.change(screen.getByLabelText("Reason for archiving"), { target: { value: "Resident requested privacy." } });
  fireEvent.click(screen.getByRole("button", { name: "Archive report" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
  expect(screen.getByLabelText("Reason for archiving")).toHaveValue("Resident requested privacy.");
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Archive report" }));
  await waitFor(() => expect(screen.queryByRole("link", { name: "AS-TEST01" })).not.toBeInTheDocument());
  expect(screen.getByRole("status")).toHaveTextContent("Report archived");
  expect(JSON.parse(fetcher.mock.calls.find(([, options]) => options?.method === "PATCH")![1]!.body as string)).toEqual({ reference: "AS-TEST01", reason: "Resident requested privacy.", confirmed: true });
});
