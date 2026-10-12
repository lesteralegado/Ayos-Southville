import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { ReportComposer } from "./report-composer";

const emergencyGuidance = {
  en: {
    message: "Call emergency services",
    phone: "911",
    sourceUrl: "https://ehotlines.e.gov.ph/",
  },
  fil: {
    message: "Tumawag sa emergency services",
    phone: "911",
    sourceUrl: "https://ehotlines.e.gov.ph/",
  },
};

describe("report composer", () => {
  it("keeps the draft and its retry key when the server pauses an in-flight submission", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/pilot-status"
      ? Response.json({ intakePaused: true, explanation: { en: "Coverage is under review.", fil: "Sinusuri ang coverage." }, resumesAt: "2026-10-15T11:00:00Z" })
      : Response.json({ code: "INTAKE_PAUSED" }, { status: 409 })));
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/category/i), "streetlights");
    await user.type(screen.getByLabelText(/describe/i), "The streetlight beside the court is broken.");
    await user.type(screen.getByLabelText("Nearby landmark", { exact: true }), "Covered court");
    await user.click(screen.getByLabelText("I confirm this is not an emergency."));
    await user.click(screen.getByLabelText(/I understand that only/));
    const before = localStorage.getItem("ayos-report-draft-v1");
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    await waitFor(() => expect(screen.getByText(/New reports are paused/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Coverage is under review.")).toBeInTheDocument());
    expect(screen.getByText(/Expected resumption:/)).toBeInTheDocument();
    expect(localStorage.getItem("ayos-report-draft-v1")).toBe(before);
    expect(push).not.toHaveBeenCalled();
  });
  it("recovers a saved receipt before validating a category disabled since submission", async () => {
    localStorage.setItem(
      "ayos-report-draft-v1:r1",
      JSON.stringify({
        version: 1,
        idempotencyKey: "disabled-category-retry",
        category: "streetlights",
        description: "The streetlight beside the covered court is broken.",
        nearbyLandmark: "Covered court",
        isEmergency: false,
        confirmNonEmergency: true,
        confirmPublicSummary: true,
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          url.startsWith("/api/evidence")
            ? { assets: [] }
            : { reference: "AS-ORIGINAL", created: false },
      })),
    );
    render(
      <ReportComposer
        residentUid="r1"
        emergencyGuidance={emergencyGuidance}
        categories={[]}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /resume draft/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /submit report/i }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/reports/AS-ORIGINAL"),
    );
  });
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("recovers or discards an unfinished private device draft", async () => {
    const user = userEvent.setup();
    const first = render(
      <ReportComposer emergencyGuidance={emergencyGuidance} />,
    );
    await user.selectOptions(
      screen.getByLabelText(/category/i),
      "streetlights",
    );
    await user.type(
      screen.getByLabelText(/describe/i),
      "The streetlight beside the covered court is dark every night.",
    );
    await user.type(
      screen.getByLabelText("Nearby landmark", { exact: true }),
      "Phase 2 covered court",
    );
    first.unmount();

    const resumed = render(
      <ReportComposer emergencyGuidance={emergencyGuidance} />,
    );
    expect(screen.getByText(/unfinished private draft/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /resume draft/i }));
    expect(screen.getByLabelText(/describe/i)).toHaveValue(
      "The streetlight beside the covered court is dark every night.",
    );

    resumed.unmount();
    // Discard is offered when returning to an unfinished draft, not while editing it.
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    await user.click(screen.getByRole("button", { name: /discard draft/i }));
    expect(screen.getByLabelText(/describe/i)).toHaveValue("");
    expect(localStorage.getItem("ayos-report-draft-v1")).toBeNull();
  });

  it("diverts a potential emergency to configured guidance", async () => {
    const user = userEvent.setup();
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);

    await user.click(
      screen.getByRole("checkbox", { name: /immediate danger/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/911/);
    expect(
      screen.getByRole("button", { name: /submit report/i }),
    ).toBeDisabled();
  });

  it("shows an accessible bilingual error summary for incomplete input", async () => {
    localStorage.setItem("ayos-locale", "fil");
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);

    await userEvent.click(
      screen.getByRole("button", { name: /isumite ang ulat/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /suriin ang mga field/i,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByLabelText(/kategorya/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/hindi ito emergency/i)).toHaveAttribute(
      "aria-describedby",
      "confirm-non-emergency-error",
    );
    expect(
      screen.getByRole("checkbox", { name: /tinatayang lugar lamang/i }),
    ).toHaveAttribute("aria-describedby", "confirm-public-summary-error");
  });

  it("ignores a corrupt or stale stored draft", () => {
    localStorage.setItem(
      "ayos-report-draft-v1",
      JSON.stringify({ description: 42, version: 0 }),
    );
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);

    expect(
      screen.queryByText(/unfinished private draft/i),
    ).not.toBeInTheDocument();
  });

  it("retries an ambiguous failure with the same idempotency key", async () => {
    const user = userEvent.setup();
    const submitReport = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network disconnected"))
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ reference: "AS-7K3M2Q", created: true }),
      });
    vi.stubGlobal("fetch", submitReport);
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    await user.selectOptions(
      screen.getByLabelText(/category/i),
      "streetlights",
    );
    await user.type(
      screen.getByLabelText(/describe/i),
      "The streetlight beside the covered court is dark every night.",
    );
    await user.type(
      screen.getByLabelText("Nearby landmark", { exact: true }),
      "Phase 2 covered court",
    );
    await user.click(
      screen.getByLabelText(/confirm this is not an emergency/i),
    );
    await user.click(
      screen.getByLabelText(/reviewed safe summary and approximate area/i),
    );

    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(
      await screen.findByText(/keep this draft unchanged/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/describe/i)).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: /check submission again/i }),
    );

    const firstBody = JSON.parse(submitReport.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(submitReport.mock.calls[1][1].body as string);
    expect(secondBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    expect(push).toHaveBeenCalledWith("/reports/AS-7K3M2Q");
  });
  it("submits using only an accessible landmark without loading map tiles", async () => {
    const user = userEvent.setup();
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ reference: "AS-LANDMARK", created: true }),
    });
    vi.stubGlobal("fetch", request);
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    await user.selectOptions(
      screen.getByLabelText(/category/i),
      "streetlights",
    );
    await user.type(
      screen.getByLabelText(/describe/i),
      "The streetlight near the court is not working at night.",
    );
    await user.type(
      screen.getByLabelText("Nearby landmark", { exact: true }),
      "Covered court",
    );
    await user.click(
      screen.getByLabelText(/confirm this is not an emergency/i),
    );
    await user.click(
      screen.getByLabelText(/reviewed safe summary and approximate area/i),
    );
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(push).toHaveBeenCalledWith("/reports/AS-LANDMARK");
    expect(
      JSON.parse(request.mock.calls[0][1].body).exactLocation,
    ).toBeUndefined();
    expect(
      screen.queryByRole("region", { name: /optional location map/i }),
    ).not.toBeInTheDocument();
  });
});
