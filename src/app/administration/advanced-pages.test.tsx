import { vi } from "vitest";
const state = vi.hoisted(() => ({ actor: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getVerifiedOperator: state.actor }));
vi.mock("next/navigation", () => ({ redirect: (location: string) => { throw new Error(location); } }));
import Operations from "./operations/page";
import Measurement from "./measurement/page";

describe.each([
  ["/administration/operations", Operations],
  ["/administration/measurement", Measurement],
] as const)("advanced route %s", (path, Page) => {
  it("redirects signed-out visitors", async () => {
    state.actor.mockResolvedValue(null);
    await expect(Page()).rejects.toThrow(`/sign-in?next=${path}`);
  });
  it.each(["Resident", "Moderator", "Coordinator"])("denies %s deep links", async role => {
    state.actor.mockResolvedValue({ uid: "person", roles: [role] });
    await expect(Page()).rejects.toThrow("/account");
  });
  it("allows administrators to render the advanced workspace", async () => {
    state.actor.mockResolvedValue({ uid: "admin", roles: ["Administrator"] });
    expect(await Page()).toBeTruthy();
  });
});
