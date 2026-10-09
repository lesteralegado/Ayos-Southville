import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedResident: vi.fn(),
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
}));

vi.mock("@/features/auth/session", () => ({ getVerifiedResident: mocks.getVerifiedResident }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdmin: vi.fn() }));

import AccountPage from "./page";

beforeEach(() => vi.clearAllMocks());

it("rejects unauthenticated access at the account boundary", async () => {
  mocks.getVerifiedResident.mockResolvedValue(null);

  await expect(AccountPage()).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?next=/account");
});
