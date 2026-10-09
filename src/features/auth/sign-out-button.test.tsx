import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { SignOutButton } from "./sign-out-button";

it("keeps the resident in place and reports a failed sign-out", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  render(<SignOutButton />);

  await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/could not sign out/i);
  expect(push).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
