import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { ProductNavigation } from "./product-navigation";

const route = vi.hoisted(() => ({ pathname: "/account/reports" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
beforeEach(() => localStorage.clear());

it("does not expose account or operator links from roles without an authenticated session", () => {
  render(<ProductNavigation roles={["Administrator"]} signedIn={false} />);
  const nav = within(screen.getByRole("navigation"));
  expect(nav.getAllByRole("link")).toHaveLength(1);
  expect(nav.getByRole("link", { name: "Community reports" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
});

it.each([[], ["Resident"], ["Moderator"], ["Coordinator"], ["Administrator"]])("shows only authorized everyday destinations for %j", (...roles: string[]) => {
  render(<ProductNavigation roles={roles} signedIn={roles.length > 0} />);
  const nav = within(screen.getByRole("navigation", { name: "Primary navigation" }));
  expect(nav.getByRole("link", { name: "Community reports" })).toHaveAttribute("href", "/");
  if (roles.length) {
    expect(nav.getByRole("link", { name: "Report a concern" })).toHaveAttribute("href", "/reports/new");
    expect(nav.getByRole("link", { name: "My reports" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Account" })).toBeInTheDocument();
  } else {
    expect(nav.queryByRole("link", { name: "Report a concern" })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: "My reports" })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  }
  expect(nav.queryByRole("link", { name: "Report operations" }) !== null).toBe(roles.some(role => ["Moderator", "Coordinator", "Administrator"].includes(role)));
  expect(nav.queryByRole("link", { name: /Insights|Administration|Pilot/ })).not.toBeInTheDocument();
});

it("identifies report details as community reports and supports Filipino", () => {
  route.pathname = "/reports/AS-ABC123";
  localStorage.setItem("ayos-locale", "fil");
  render(<ProductNavigation />);
  expect(screen.getByRole("link", { name: "Mga ulat sa komunidad" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("navigation", { name: "Pangunahing nabigasyon" })).toBeInTheDocument();
});
