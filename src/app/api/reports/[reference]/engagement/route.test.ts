import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ resident: vi.fn(), access: vi.fn(), affected: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getVerifiedResident: state.resident, hasPilotAccess: state.access }));
vi.mock("@/features/reports/firebase-engagement-store", () => ({ getEngagementModule: () => ({ setAffected: state.affected }) }));
import { POST } from "./route";
beforeEach(() => { vi.clearAllMocks(); state.resident.mockResolvedValue({ uid: "resident" }); state.access.mockResolvedValue(false); });
it("denies direct evidence attachment by a verified unapproved resident", async () => {
  const response = await POST(new Request("https://ayos.test/api/reports/AS-123456/engagement", { method: "POST", headers: { origin: "https://ayos.test", "content-type": "application/json" }, body: JSON.stringify({ action: "affected", active: true, evidence: [{ id: "fake-photo" }] }) }), { params: Promise.resolve({ reference: "AS-123456" }) });
  expect(response.status).toBe(403);
  expect(state.affected).not.toHaveBeenCalled();
});
