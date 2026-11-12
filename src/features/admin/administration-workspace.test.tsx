import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { AdministrationWorkspace } from "./administration-workspace";
import { defaultPilotConfiguration } from "./administration-module";
import { defaultPilotOperations } from "./pilot-operations";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.localStorage.clear(); });

it("keeps routine tasks visible and reveals advanced controls on request", () => {
  render(<AdministrationWorkspace initial={{ users: [], configuration: defaultPilotConfiguration, invitations: [], audit: [] }} />);
  expect(screen.getByRole("heading", { name: "People and access" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Report categories" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Audit history" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
  expect(screen.getByRole("heading", { name: "Audit history" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Privacy operations" })).toHaveAttribute("href", "/administration/operations");
});

it("shows confirmed pause state and preserves operating edits on a stale-save conflict", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "CONFLICT", error: "Settings changed. Refresh before retrying." }, { status: 409 })));
  render(<AdministrationWorkspace initial={{ users: [], configuration: defaultPilotConfiguration, invitations: [], audit: [], operations: defaultPilotOperations }} />);
  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
  fireEvent.click(screen.getByLabelText("Pause new reports"));
  fireEvent.change(screen.getByLabelText("Public explanation · English"), { target: { value: "Coverage unavailable." } });
  fireEvent.change(screen.getByLabelText("Public explanation · Filipino"), { target: { value: "Walang operator." } });
  fireEvent.click(screen.getByRole("button", { name: "Save operating controls" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Settings changed"));
  expect(screen.getByLabelText("Pause new reports")).toBeChecked();
  expect(screen.getByText("New reports: open")).toBeInTheDocument();
  expect(screen.queryByText("Changes saved.")).not.toBeInTheDocument();
});

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
