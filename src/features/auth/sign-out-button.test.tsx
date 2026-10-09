import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

import { SignOutButton } from "./sign-out-button";

it("keeps the resident in place and reports a failed sign-out", async () => {
  push.mockClear();
  refresh.mockClear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  render(<SignOutButton />);

  await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/could not sign out/i);
  expect(push).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it("clears the session and returns home after successful sign-out", async () => {
  push.mockClear();
  refresh.mockClear();
  const clearSession = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", clearSession);
  render(<SignOutButton />);

  await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

  expect(clearSession).toHaveBeenCalledWith("/api/session", { method: "DELETE" });
  expect(push).toHaveBeenCalledWith("/");
  expect(refresh).toHaveBeenCalled();
  vi.unstubAllGlobals();
});
