import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ReportEngagement } from "./report-engagement";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("recognizes affected-only subscriptions and stops them through the unified action", async () => {
  const request = vi.fn((_url: string, options?: RequestInit) => Promise.resolve(new Response(JSON.stringify({ affected: options?.method !== "POST", following: false, supportingEvidence: [] }), { status: 200 })));
  vi.stubGlobal("fetch", request);
  render(<ReportEngagement reference="AS-LEGACY" />);
  await userEvent.click(await screen.findByRole("button", { name: "Stop updates" }));
  await screen.findByRole("button", { name: "Get updates" });
  expect(JSON.parse(request.mock.calls.find(call => call[1]?.method === "POST")![1]!.body as string)).toMatchObject({ action: "updates", active: false });
});
it("announces Filipino pending/failure states and restores the previous affected choice", async () => {
  localStorage.setItem("ayos-locale", "fil");
  let rejectUpdate: (reason: unknown) => void = () => undefined;
  const pending = new Promise<Response>((_resolve, reject) => { rejectUpdate = reject; });
  vi.stubGlobal("fetch", vi.fn((_url: string, options?: RequestInit) => options?.method === "POST" ? pending : Promise.resolve(new Response(JSON.stringify({ affected: false, following: false, supportingEvidence: [] }), { status: 200 }))));
  render(<ReportEngagement reference="AS-ABC123" />);
  expect(screen.getByRole("heading", { name: "Subaybayan ang ulat" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Tumanggap ng mga update" }));
  expect(screen.getByRole("status")).toHaveTextContent("Sine-save ang inyong pinili");
  rejectUpdate(new Error("Offline"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Hindi na-save ang pagbabago"));
  expect(screen.getByRole("button", { name: "Tumanggap ng mga update" })).toHaveAttribute("aria-pressed", "false");
});
