import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { ReportComposer } from "./report-composer";

const emergencyGuidance = { phone: "911", sourceUrl: "https://ehotlines.e.gov.ph/" };

describe("report composer", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("recovers or discards an unfinished private device draft", async () => {
    const user = userEvent.setup();
    const first = render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    await user.selectOptions(screen.getByLabelText(/category/i), "streetlights");
    await user.type(screen.getByLabelText(/describe/i), "The streetlight beside the covered court is dark every night.");
    await user.type(screen.getByLabelText("Nearby landmark", { exact: true }), "Phase 2 covered court");
    first.unmount();

    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    expect(screen.getByText(/unfinished private draft/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /resume draft/i }));
    expect(screen.getByLabelText(/describe/i)).toHaveValue("The streetlight beside the covered court is dark every night.");

    await user.click(screen.getByRole("button", { name: /discard draft/i }));
    expect(screen.getByLabelText(/describe/i)).toHaveValue("");
    expect(localStorage.getItem("ayos-report-draft-v1")).toBeNull();
  });

  it("diverts a potential emergency to configured guidance", async () => {
    const user = userEvent.setup();
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);

    await user.click(screen.getByRole("checkbox", { name: /immediate danger/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/911/);
    expect(screen.getByRole("button", { name: /submit report/i })).toBeDisabled();
  });

  it("shows an accessible bilingual error summary for incomplete input", async () => {
    localStorage.setItem("ayos-locale", "fil");
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);

    await userEvent.click(screen.getByRole("button", { name: /isumite ang ulat/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/suriin ang mga field/i);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByLabelText(/kategorya/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/hindi ito emergency/i)).toHaveAttribute("aria-describedby", "confirm-non-emergency-error");
    expect(screen.getByRole("checkbox", { name: /tinatayang lugar lamang/i })).toHaveAttribute("aria-describedby", "confirm-public-summary-error");
  });

  it("ignores a corrupt or stale stored draft", () => {
    localStorage.setItem("ayos-report-draft-v1", JSON.stringify({ description: 42, version: 0 }));
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);

    expect(screen.queryByText(/unfinished private draft/i)).not.toBeInTheDocument();
  });

  it("retries an ambiguous failure with the same idempotency key", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn()
      .mockRejectedValueOnce(new TypeError("network disconnected"))
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ reference: "AS-7K3M2Q", created: true }) });
    vi.stubGlobal("fetch", submitReport);
    render(<ReportComposer emergencyGuidance={emergencyGuidance} />);
    await user.selectOptions(screen.getByLabelText(/category/i), "streetlights");
    await user.type(screen.getByLabelText(/describe/i), "The streetlight beside the covered court is dark every night.");
    await user.type(screen.getByLabelText("Nearby landmark", { exact: true }), "Phase 2 covered court");
    await user.click(screen.getByLabelText(/confirm this is not an emergency/i));
    await user.click(screen.getByLabelText(/reviewed safe summary and approximate area/i));

    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/draft is safe/i);
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    const firstBody = JSON.parse(submitReport.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(submitReport.mock.calls[1][1].body as string);
    expect(secondBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    expect(push).toHaveBeenCalledWith("/reports/AS-7K3M2Q");
  });
});
