import { authDestination } from "./auth-destination";
it("returns to an authorized local surface without accepting an external redirect", () => {
  expect(authDestination("/reports/AS-123?from=notification")).toBe("/reports/AS-123?from=notification");
  expect(authDestination("/account/notifications")).toBe("/account/notifications");
  for (const value of [undefined, "https://example.test", "//example.test", "/\\example.test", "/api/internal/email-delivery"]) expect(authDestination(value)).toBe("/account");
});
