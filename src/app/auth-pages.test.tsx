import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import RegisterPage from "./register/page";
import SignInPage from "./sign-in/page";

describe("resident authentication", () => {
  it("collects a private email and a separate public alias for registration", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { name: /join the resident pilot/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/public alias/i)).toHaveAttribute("autocomplete", "nickname");
    expect(screen.getByText(/email stays private/i)).toBeInTheDocument();
  });

  it("offers an accessible sign-in form for returning residents", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
