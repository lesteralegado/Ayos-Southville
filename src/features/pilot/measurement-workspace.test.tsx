import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MeasurementWorkspace } from "./measurement-workspace";
import { createMemoryPilotMeasurementStore, createPilotMeasurement } from "./pilot-measurement";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it("saves a failed assisted exercise and reads its confirmed provenance without inflating real findings", async () => {
  const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore()), admin = { uid: "admin", roles: ["Administrator"] as const };
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") { await measurement.record(admin, JSON.parse(String(init.body))); return new Response(JSON.stringify({ ok: true }), { status: 201 }); }
    return new Response(JSON.stringify(await measurement.read(admin)));
  });
  render(<MeasurementWorkspace />);
  await screen.findByText("Insufficient real sample: collect at least 10 consenting participants.");
  fireEvent.change(screen.getByLabelText("Participant code (P01–P9999)"), { target: { value: "P01" } });
  fireEvent.change(screen.getByLabelText("Submission"), { target: { value: "false" } });
  fireEvent.change(screen.getByLabelText("Assistance needed"), { target: { value: "true" } });
  fireEvent.click(screen.getByRole("button", { name: "Save finding" }));
  expect(await screen.findByText("Saved and confirmed from current records.")).toBeInTheDocument();
  expect((await measurement.read(admin)).summary).toMatchObject({ real: { participants: 0 }, exercise: { participants: 1, submissions: 0, unassistedSubmissionRate: 0 } });
});
it("shows insufficient real sample and separate exercise and unknown findings after authorized loading", async () => {
  const data = await createPilotMeasurement(createMemoryPilotMeasurementStore()).read({ uid: "admin", roles: ["Administrator"] });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
  render(<MeasurementWorkspace />);
  expect(await screen.findByText("Insufficient real sample: collect at least 10 consenting participants.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Exercise findings" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Unknown legacy findings" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Record approval and trial start" })).toBeInTheDocument();
  expect(screen.getByLabelText("Explicit release approval has been granted")).not.toBeChecked();
});
