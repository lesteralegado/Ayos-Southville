// @vitest-environment node
import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), uid: "admin" }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary");
  const db = firebaseBoundary(fixture.records);
  return { getFirebaseAdmin: () => ({ db, auth: { verifySessionCookie: async () => ({ uid: fixture.uid, email_verified: true }), getUser: async () => ({ emailVerified: true, disabled: false }) } }) };
});
import { GET, POST } from "@/app/api/pilot-measurement/route";
beforeEach(() => { fixture.uid = "admin"; fixture.records.clear(); fixture.records.set("residentProfiles/admin", { roles: ["Administrator"] }); });
const request = (input: unknown) => new Request("https://example.test/api/pilot-measurement", { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: JSON.stringify(input) });
it("refuses unauthorized reads and edits and rejects cross-origin writes", async () => {
  fixture.records.set("residentProfiles/admin", { roles: ["Resident"], pilotAccess: "approved" });
  expect((await GET()).status).toBe(403);
  expect((await POST(request({}))).status).toBe(403);
  expect((await POST(new Request("https://example.test/api/pilot-measurement", { method: "POST", headers: { origin: "https://other.test", "content-type": "application/json" }, body: "{}" }))).status).toBe(403);
});
it("concurrent retries preserve one current participant and refuse a stale edit", async () => {
  const input = { participantCode: "P01", source: "exercise", expectedRevision: 0, submitted: false, assisted: true, understoodStatus: null, foundDuplicate: null, completedLifecycle: null };
  const responses = await Promise.all([POST(request(input)), POST(request(input))]);
  expect(responses.map(response => response.status).toSorted()).toEqual([201, 409]);
  expect((await (await GET()).json()).summary.exercise.participants).toBe(1);
});
it("edits a legacy unknown finding without leaving duplicate or stale read records", async () => {
  fixture.records.set("pilotMeasurements/P02", { participantCode: "P02", submitted: true, assisted: false });
  expect((await POST(request({ participantCode: "P02", source: "unknown", expectedRevision: 0, submitted: false, assisted: true, understoodStatus: null, foundDuplicate: null, completedLifecycle: null }))).status).toBe(201);
  const payload = await (await GET()).json();
  expect(payload.records).toEqual([expect.objectContaining({ participantCode: "P02", source: "unknown", submitted: false, revision: 1 })]);
});
it("keeps unknown legacy findings out of real outcomes and allowlists trial and record reads", async () => {
  fixture.records.set("pilotMeasurements/P02", { participantCode: "P02", submitted: true, assisted: false, email: "private@example.test", notes: "Block 9 Lot 12" });
  fixture.records.set("pilotEvaluation/current", { revision: 1, startedAt: "2026-10-12T00:00:00Z", plannedThrough: "2026-11-09T00:00:00Z", releaseApprovedAt: "2026-10-12T00:00:00Z", evidenceCode: "EVID-01", capacity: 10, notes: "Private family", email: "private@example.test" });
  const payload = await (await GET()).json();
  expect(payload.summary).toMatchObject({ real: { participants: 0 }, unknown: { participants: 1 } });
  expect(JSON.stringify(payload)).not.toMatch(/private@example|Private family|Block 9/);
});
it("records and reads an exercise through the authorized API with optimistic edit protection", async () => {
  const input = { participantCode: "P01", source: "exercise", submitted: false, assisted: true, understoodStatus: null, foundDuplicate: false, completedLifecycle: null, expectedRevision: 0 };
  expect((await POST(request(input))).status).toBe(201);
  expect(await (await GET()).json()).toMatchObject({ records: [expect.objectContaining({ source: "exercise", revision: 1 })], summary: { exercise: { participants: 1 }, real: { participants: 0 } } });
  expect((await POST(request(input))).status).toBe(409);
});
