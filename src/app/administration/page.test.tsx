import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  actor: vi.fn(),
  redirect: vi.fn((location: string) => {
    throw new Error(location);
  }),
}));
vi.mock("@/features/auth/session", () => ({
  getVerifiedOperator: state.actor,
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/features/admin/firebase-administration-store", () => ({
  getAdministrationModule: () => {
    throw new Error("Private data must not load");
  },
}));
import AdministrationPage from "./page";
it("redirects unauthenticated visitors before loading private administration data", async () => {
  state.actor.mockResolvedValue(null);
  await expect(AdministrationPage()).rejects.toThrow(
    "/sign-in?next=/administration",
  );
});
it("redirects a resident before loading private administration data", async () => {
  state.actor.mockResolvedValue({ uid: "resident", roles: ["Resident"] });
  await expect(AdministrationPage()).rejects.toThrow("/account");
});
