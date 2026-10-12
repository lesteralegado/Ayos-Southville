import { vi } from "vitest";
import {
  createMemoryModerationStore,
  createModerationModule,
  type ModerationReport,
  type Operator,
} from "@/features/reports/moderation-module";
const state = vi.hoisted(() => ({
  actor: null as Operator | null,
  access: true,
  moderation: null as ReturnType<typeof createModerationModule> | null,
}));
vi.mock("@/features/auth/session", () => ({
  getVerifiedOperator: async () => state.actor,
  hasPilotAccess: async () => state.access,
  hasPilotEligibility: async () => state.access,
}));
vi.mock("@/features/reports/firebase-moderation-store", () => ({
  getModerationModule: () => state.moderation,
}));
vi.mock("@/features/admin/firebase-administration-store", () => ({
  getPublicPilotConfiguration: async () => ({
    destinations: [{ id: "lighting", active: true }],
  }),
}));
import { GET, PATCH } from "./route";
const seed: ModerationReport = {
  reference: "AS-300001",
  reporterUid: "r1",
  category: "streetlights",
  description: "Private phone 09171234567",
  nearbyLandmark: "Block 9 Lot 12",
  evidence: [],
  status: "Submitted",
  submittedAt: "2026-10-10T02:00:00Z",
  public: { summary: "", area: "", media: [] },
  followers: [],
  affectedResidents: [],
  supportingEvidence: [],
  history: [],
};
beforeEach(() => {
  state.actor = { uid: "operator", roles: ["Administrator"] };
  state.access = true;
  state.moderation = createModerationModule({
    store: createMemoryModerationStore({ reports: [seed] }),
  });
});
const request = (action: string, input: unknown) =>
  new Request("https://ayos.test/api/moderation", {
    method: "PATCH",
    headers: {
      origin: "https://ayos.test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, input }),
  });
const acceptance = {
  reference: seed.reference,
  expectedRevision: 0,
  publicSummary: "Broken light near the court.",
  publicArea: "Covered court",
  approvedMedia: [],
  reason: "Private identity removed.",
  publicLocation: { latitude: 14.281234, longitude: 121.126789 },
};
it("publishes explicit redaction and returns a conflict on a repeated stale request", async () => {
  expect((await PATCH(request("accept", acceptance))).status).toBe(200);
  const response = await GET();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).reports[0]).toMatchObject({
    status: "Under review",
    revision: 1,
    public: { location: { latitude: 14.28, longitude: 121.13 } },
  });
  const repeated = await PATCH(request("accept", acceptance));
  expect(repeated.status).toBe(409);
  expect(
    JSON.stringify(await state.moderation!.getPublicReport(seed.reference)),
  ).not.toMatch(/09171234567|Block 9/);
});
it.each(["Resident", "Coordinator"] as const)(
  "denies %s attempts to accept reports",
  async (role) => {
    state.actor = { uid: "forbidden", roles: [role] };
    expect((await PATCH(request("accept", acceptance))).status).toBe(403);
  },
);
it("denies revoked operator access and malformed direct requests", async () => {
  state.access = false;
  expect((await GET()).status).toBe(403);
  state.access = true;
  expect((await PATCH(request("accept", null))).status).toBe(422);
});
it("accepts only the original reporter's current resolution response and publishes a safe outcome", async () => {
  state.moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [{ ...seed, status: "Resolved", revision: 4, resolutionEvidence: [{ id: "proof", name: "proof.jpg", type: "image/jpeg", size: 20, visibility: "restricted" }] }] }) });
  const input = { reference: seed.reference, expectedRevision: 4, response: "dispute", reason: "Private phone 09171234567; still broken.", update: { en: "Private malicious text", fil: "Private malicious text" } };
  state.actor = { uid: "neighbor", roles: ["Resident"] };
  expect((await PATCH(request("respond-to-resolution", input))).status).toBe(403);
  state.actor = { uid: "r1", roles: ["Resident"] };
  expect((await PATCH(request("respond-to-resolution", input))).status).toBe(200);
  const publicReport = await state.moderation.getPublicReport(seed.reference);
  expect(publicReport.status).toBe("Under review");
  expect(JSON.stringify(publicReport)).not.toMatch(/09171234567|malicious/);
  expect((await PATCH(request("respond-to-resolution", input))).status).toBe(409);
  expect(await state.moderation.listNotifications("r1")).toHaveLength(1);
});
