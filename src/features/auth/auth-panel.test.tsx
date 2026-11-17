import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => fixture }));
vi.mock("@/lib/firebase/client", () => ({ getSessionlessAuth: async () => ({}), getFirebaseClient: () => ({ db: {} }) }));
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: async () => ({ user: { emailVerified: true, getIdToken: async () => "synthetic-token" } }), signOut: async () => {}, createUserWithEmailAndPassword: vi.fn(), deleteUser: vi.fn(), sendEmailVerification: vi.fn(), updateProfile: vi.fn() }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn() }));
import { AuthPanel } from "./auth-panel";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); localStorage.clear(); });
it("creates the server session before returning to the private notification destination", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true })); vi.stubGlobal("fetch", fetch);
  render(<AuthPanel mode="sign-in" nextPath="/reports/AS-PRIVATE?from=notification" />);
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "resident@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "synthetic-password" } });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  await waitFor(() => expect(fixture.push).toHaveBeenCalledWith("/reports/AS-PRIVATE?from=notification"));
  expect(fetch).toHaveBeenCalledWith("/api/session", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
});
