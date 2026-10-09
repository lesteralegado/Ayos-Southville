import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  createUser: vi.fn(),
  signIn: vi.fn(),
  sendVerification: vi.fn(),
  firebaseSignOut: vi.fn(),
  updateProfile: vi.fn(),
  deleteUser: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: mocks.createUser,
  signInWithEmailAndPassword: mocks.signIn,
  sendEmailVerification: mocks.sendVerification,
  signOut: mocks.firebaseSignOut,
  updateProfile: mocks.updateProfile,
  deleteUser: mocks.deleteUser,
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  serverTimestamp: () => "server-time",
  setDoc: mocks.setDoc,
  deleteDoc: mocks.deleteDoc,
}));

vi.mock("@/lib/firebase/client", () => ({
  getSessionlessAuth: async () => ({ name: "auth" }),
  getFirebaseClient: () => ({ db: { name: "db" } }),
}));

import RegisterPage from "./register/page";
import SignInPage from "./sign-in/page";

describe("resident authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.sendVerification.mockResolvedValue(undefined);
    mocks.firebaseSignOut.mockResolvedValue(undefined);
    mocks.updateProfile.mockResolvedValue(undefined);
  });

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

  it("creates a private profile and sends verification without publishing an alias", async () => {
    const user = userEvent.setup();
    const firebaseUser = { uid: "resident-1" };
    mocks.createUser.mockResolvedValue({ user: firebaseUser });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email address/i), "Resident@Example.com");
    await user.type(screen.getByLabelText(/public alias/i), "Mapagmasid");
    await user.type(screen.getByLabelText(/password/i), "safe-password");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "residentProfiles/resident-1" },
      expect.objectContaining({ publicAlias: "Mapagmasid" }),
    ));
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.sendVerification).toHaveBeenCalledWith(firebaseUser, expect.any(Object));
    expect(mocks.push).toHaveBeenCalledWith("/register/check-email?email=resident%40example.com");
  });

  it("gates an unverified sign-in and sends a fresh verification link", async () => {
    const user = userEvent.setup();
    const firebaseUser = { emailVerified: false };
    mocks.signIn.mockResolvedValue({ user: firebaseUser });
    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email address/i), "resident@example.com");
    await user.type(screen.getByLabelText(/password/i), "safe-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/verify your email first/i);
    expect(mocks.sendVerification).toHaveBeenCalledWith(firebaseUser, expect.any(Object));
    expect(mocks.push).not.toHaveBeenCalledWith("/account");
  });
});
