import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { AdministrationWorkspace } from "./administration-workspace";
import { defaultPilotConfiguration } from "./administration-module";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.localStorage.clear(); });

it("shows recoverable connection failure without claiming a save", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Offline")));
  render(<AdministrationWorkspace initial={{ users: [], configuration: defaultPilotConfiguration, invitations: [], audit: [] }} />);
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "neighbor@example.test" } });
  fireEvent.change(screen.getByLabelText("Invitation reason"), { target: { value: "Pilot tester" } });
  fireEvent.click(screen.getByRole("button", { name: "Invite resident" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Connection lost"));
  expect(screen.queryByText("Changes saved.")).not.toBeInTheDocument();
});

it("invites a neighbor and shows server-confirmed state in the workspace", async () => {
  const initial = {
    users: [
      { uid: "admin", roles: ["Administrator"] as const, emailVerified: true },
    ],
    configuration: defaultPilotConfiguration,
    invitations: [],
    audit: [],
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...initial,
            invitations: [{ email: "neighbor@example.test", active: true }],
          }),
        ),
      ),
  );
  render(
    <AdministrationWorkspace
      initial={{
        ...initial,
        users: [
          { uid: "admin", roles: ["Administrator"], emailVerified: true },
        ],
      }}
    />,
  );
  fireEvent.change(screen.getAllByLabelText("English label")[0], {
    target: { value: "Unsaved category wording" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "neighbor@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Invitation reason"), {
    target: { value: "Pilot tester" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Invite resident" }));
  await waitFor(() =>
    expect(screen.getByText("Changes saved.")).toBeInTheDocument(),
  );
  expect(screen.getByText(/neighbor@example.test.*Active/)).toBeInTheDocument();
  expect(screen.getAllByLabelText("English label")[0]).toHaveValue(
    "Unsaved category wording",
  );
  vi.unstubAllGlobals();
});
