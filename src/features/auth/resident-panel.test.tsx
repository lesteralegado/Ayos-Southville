import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/lib/firebase/client", () => ({ getFirebaseClient: () => ({ auth: {} }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/account" }));
import { ResidentPanel } from "./resident-panel";
import { ProductNavigation } from "@/features/navigation/product-navigation";
beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });
it("keeps confirmed participation compact while disclosure and the private receipt remain available", async () => {
  const receipt = { id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T11:00:00Z", adultAcknowledged: true, locale: "en" };
  vi.stubGlobal("fetch", async () => Response.json({ eligible: true, receipt, version: receipt.version }));
  render(<ResidentPanel publicAlias="Synthetic neighbor" approved />);
  await screen.findByRole("heading", { name: "Participation confirmed" });
  const details = screen.getByText("View participation details and receipt");
  expect(details.closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Sign out" }).closest("details")).toBeNull();
  expect(screen.getByRole("link", { name: "Privacy and my data" }).closest("details")).toBeNull();
  await userEvent.click(details);
  expect(details.closest("details")).toHaveAttribute("open");
  expect(screen.getByRole("heading", { name: "About this trial" })).toBeVisible();
  expect(screen.getByText(receipt.id)).toBeVisible();
});
it("uses the shared language control on Account and retains one for standalone use", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ eligible: true, receipt: null, version: "southville-adult-pilot-2026-10-12", reportCount: 0 }));
  const { unmount } = render(<><ProductNavigation signedIn /><ResidentPanel publicAlias="Neighbor" showLanguageControl={false} /></>);
  expect(screen.getAllByRole("button", { name: "Filipino" })).toHaveLength(1);
  await userEvent.click(screen.getByRole("button", { name: "Filipino" }));
  expect(screen.getByRole("heading", { name: "Kumusta, Neighbor." })).toBeInTheDocument();
  unmount();
  render(<ResidentPanel publicAlias="Neighbor" />);
  expect(screen.getAllByRole("button", { name: "English" })).toHaveLength(1);
  await screen.findByText("Wala pang naitalang pahintulot sa pagsali.");
});
it("expands decision information and removes the confirmed claim when a saved receipt cannot be refreshed", async () => {
  const receipt = { id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T11:00:00Z", adultAcknowledged: true, locale: "en" };
  let offline = false;
  vi.stubGlobal("fetch", async () => {
    if (offline) throw new TypeError("Offline");
    return Response.json({ eligible: true, receipt, version: receipt.version });
  });
  render(<ResidentPanel publicAlias="Neighbor" />);
  await screen.findByRole("heading", { name: "Participation confirmed" });
  offline = true;
  await userEvent.click(screen.getByRole("button", { name: "Reload private participation status" }));
  await screen.findByText(/Consent could not be confirmed/);
  expect(screen.queryByRole("heading", { name: "Participation confirmed" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "About this trial" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "Continue to report" })).not.toBeInTheDocument();
});
it.each([
  { eligible: true, receipt: null, version: "old-version" },
  { eligible: true, receipt: { id: "invalid" }, version: "southville-adult-pilot-2026-10-12" },
])("never claims participation for an outdated or invalid receipt: %j", async response => {
  vi.stubGlobal("fetch", async () => Response.json(response));
  render(<ResidentPanel publicAlias="Neighbor" />);
  await screen.findByText(/The disclosure changed|Consent could not be confirmed/);
  expect(screen.queryByRole("heading", { name: "Participation confirmed" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "About this trial" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Agree and save my consent" })).toBeDisabled();
});
it("does not retain a decline claim when reloading another-device consent, or allow choices after a failed status refresh", async () => {
  let mode = "empty";
  const receipt = { id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T11:00:00Z", adultAcknowledged: true, locale: "en" };
  vi.stubGlobal("fetch", async () => {
    if (mode === "offline") throw new TypeError("Offline");
    return Response.json({ eligible: true, receipt: mode === "saved" ? receipt : null, version: receipt.version });
  });
  const user = userEvent.setup();
  render(<ResidentPanel publicAlias="Synthetic neighbor" approved />);
  await waitFor(() => expect(screen.getByRole("button", { name: "I do not wish to participate" })).toBeEnabled());
  mode = "offline";
  await user.click(screen.getByRole("button", { name: "Reload private participation status" }));
  await waitFor(() => expect(screen.getByText(/Consent could not be confirmed/)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "I do not wish to participate" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Agree and save my consent" })).toBeDisabled();
  mode = "empty";
  await user.click(screen.getByRole("button", { name: "Reload private participation status" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "I do not wish to participate" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "I do not wish to participate" }));
  mode = "saved";
  await user.click(screen.getByRole("button", { name: "Reload private participation status" }));
  await waitFor(() => expect(screen.getByText(receipt.id)).toBeInTheDocument());
  expect(screen.queryByText(/You have not joined/)).not.toBeInTheDocument();
});
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
