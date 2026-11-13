// @vitest-environment node
import { vi } from "vitest";
const state = vi.hoisted(() => ({ signedIn: true, eligible: true, archive: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/session", () => ({ getVerifiedOperator: async () => state.signedIn ? { uid: "operator", roles: ["Administrator"] } : null, hasPilotEligibility: async () => state.eligible }));
vi.mock("@/features/reports/resident-report-actions", async importOriginal => ({ ...await importOriginal<object>(), archiveRequestedReport: state.archive }));
import { PATCH } from "./route";
const request = (body: unknown, origin = "https://ayos.test") => new Request("https://ayos.test/api/report-requests", { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const body = { reference: "AS-TEST01", reason: "Resident requested privacy.", confirmed: true };
beforeEach(() => { state.signedIn = true; state.eligible = true; state.archive.mockReset(); state.archive.mockResolvedValue({ status: "archived" }); });
it("archives using verified identity and rejects unconfirmed, cross-origin and unsigned requests", async () => {
  expect((await PATCH(request(body, "https://other.test"))).status).toBe(403);
  expect((await PATCH(request({ ...body, confirmed: false }))).status).toBe(422);
  expect(state.archive).not.toHaveBeenCalled();
  const response = await PATCH(request({ ...body, actorUid: "forged" }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(state.archive).toHaveBeenCalledWith({ uid: "operator", roles: ["Administrator"] }, "AS-TEST01", body.reason);
  state.signedIn = false;
  expect((await PATCH(request(body))).status).toBe(401);
  state.signedIn = true; state.eligible = false;
  expect((await PATCH(request(body))).status).toBe(403);
});
