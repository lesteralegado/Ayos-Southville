import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "./page";
import { vi } from "vitest";

const payload = { mode: "live", total: 1, page: 1, pages: 1,
  categories: [{ id: "streetlights", active: true, label: { en: "Configured lighting", fil: "Nasuring ilaw" } }],
  reports: [{ reference: "AS-ABC123", category: "streetlights", publicSummary: "Approved streetlight concern", publicArea: "Phase 2",
    status: "Assigned", submittedAt: "2026-10-10T00:00:00Z", media: [], timeline: [] }],
};

describe("public pilot directory", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("explains the pilot and lists approved live reports with configured categories", async () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /small reports\. visible progress\./i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/resident-led pilot/i)).toHaveLength(2);
    expect(await screen.findByRole("heading", { name: "Approved streetlight concern" })).toBeInTheDocument();
    expect(screen.getAllByText("Configured lighting")).toHaveLength(2);
    expect(screen.getByText(/phase 2/i)).toBeInTheDocument();

    expect(screen.queryByText(/reporter@example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/block 11, lot 4/i)).not.toBeInTheDocument();
  });

  it("never substitutes demo content for failure and can retry an empty live collection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "UNAVAILABLE" }), { status: 503 })));
    render(<HomePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
    expect(screen.queryByText(/AS-1042|blocked drainage/i)).not.toBeInTheDocument();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...payload, total: 0, reports: [] }), { status: 200 })));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No approved reports match/)).toBeInTheDocument();
  });

  it("switches to Filipino and restores the preference on a return visit", async () => {
    const user = userEvent.setup();
    const firstVisit = render(<HomePage />);
    await screen.findByRole("heading", { name: "Approved streetlight concern" });

    await user.click(screen.getByRole("button", { name: /filipino/i }));
    expect(screen.getByRole("link", { name: /mga ulat sa komunidad/i })).toBeInTheDocument();

    firstVisit.unmount();
    render(<HomePage />);
    await screen.findByRole("heading", { name: "Approved streetlight concern" });

    expect(screen.getByRole("link", { name: /mga ulat sa komunidad/i })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "fil");
  });
});
