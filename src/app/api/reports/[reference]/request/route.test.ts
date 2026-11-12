// @vitest-environment node
import { vi } from "vitest";
const state = vi.hoisted(() => ({ uid: "resident", change: vi.fn(), list: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getVerifiedResident: async () => state.uid ? { uid: state.uid } : null, getVerifiedOperator: async () => state.uid ? { uid: state.uid, roles: ["Resident"] } : null }));
vi.mock("@/features/reports/resident-report-actions", async importOriginal => ({ ...await importOriginal<object>(), changeResidentReport: state.change, listRemovalRequests: state.list }));
vi.mock("server-only", () => ({}));
import { POST } from "./route";
const context = { params: Promise.resolve({ reference: "AS-PRIVATE" }) };
const request = (body: unknown, origin = "https://ayos.test") => new Request("https://ayos.test/api/reports/AS-PRIVATE/request", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { state.uid = "resident"; state.change.mockReset(); state.change.mockResolvedValue({ status: "complete" }); });
it("uses session identity and protects confirmed actions from cross-origin and anonymous requests", async () => {
  expect((await POST(request({ action: "withdraw", confirmed: true }, "https://other.test"), context)).status).toBe(403);
  expect((await POST(request({ action: "withdraw", confirmed: false }), context)).status).toBe(422);
  const response = await POST(request({ action: "withdraw", confirmed: true, residentUid: "other" }), context);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(state.change).toHaveBeenCalledWith("resident", "AS-PRIVATE", "withdraw");
  state.uid = "";
  expect((await POST(request({ action: "withdraw", confirmed: true }), context)).status).toBe(401);
});
