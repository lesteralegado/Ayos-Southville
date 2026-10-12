import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/lib/firebase/client", () => ({ getFirebaseClient: () => ({ auth: {} }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { ResidentPanel } from "./resident-panel";
beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });
it("lets an eligible adult decline without claiming enrollment or losing browsing and deletion links", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ eligible: true, receipt: null, version: "southville-adult-pilot-2026-10-12" }));
  render(<ResidentPanel publicAlias="Synthetic neighbor" approved />);
  await waitFor(() => expect(screen.getByRole("button", { name: "I do not wish to participate" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "I do not wish to participate" }));
  expect(screen.getByText(/You have not joined/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse reports" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Privacy and my data" })).toHaveAttribute("href", "/account/privacy");
  expect(screen.queryByText("Your private consent receipt")).not.toBeInTheDocument();
});
it("does not claim consent success or non-enrollment after a lost acknowledgement, and recovers the persisted receipt", async () => {
  let saved = false;
  const receipt = { id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T11:00:00Z", adultAcknowledged: true, locale: "en" };
  vi.stubGlobal("fetch", async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST") { saved = true; throw new TypeError("Connection lost after commit"); }
    return Response.json({ eligible: true, receipt: saved ? receipt : null, version: receipt.version });
  });
  const user = userEvent.setup();
  render(<ResidentPanel publicAlias="Synthetic neighbor" approved />);
  await waitFor(() => expect(screen.getByLabelText("I acknowledge that I am at least 18 years old")).toBeEnabled());
  await user.click(screen.getByLabelText("I acknowledge that I am at least 18 years old"));
  await user.click(screen.getByLabelText("I understand this disclosure and voluntarily agree to participate"));
  await user.click(screen.getByRole("button", { name: "Agree and save my consent" }));
  await waitFor(() => expect(screen.getByText(/Consent could not be confirmed/)).toBeInTheDocument());
  expect(screen.queryByText("Your private consent receipt")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "I do not wish to participate" })).toBeDisabled();
  expect(screen.getByLabelText("I acknowledge that I am at least 18 years old")).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Reload private participation status" }));
  await waitFor(() => expect(screen.getByText(receipt.id)).toBeInTheDocument());
  expect(screen.getByRole("link", { name: "Continue to report" })).toHaveAttribute("href", "/reports/new");
});
