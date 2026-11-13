import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ resident: vi.fn(), access: vi.fn(), affected: vi.fn(), updates: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getVerifiedResident: state.resident, hasPilotAccess: state.access }));
vi.mock("@/features/reports/firebase-engagement-store", () => ({ getEngagementModule: () => ({ setAffected: state.affected, setUpdates: state.updates }) }));
import { POST } from "./route";
beforeEach(() => { vi.clearAllMocks(); state.resident.mockResolvedValue({ uid: "resident" }); state.access.mockResolvedValue(false); });
it("denies direct evidence attachment by a verified unapproved resident", async () => {
  const response = await POST(new Request("https://ayos.test/api/reports/AS-123456/engagement", { method: "POST", headers: { origin: "https://ayos.test", "content-type": "application/json" }, body: JSON.stringify({ action: "affected", active: true, evidence: [{ id: "fake-photo" }] }) }), { params: Promise.resolve({ reference: "AS-123456" }) });
  expect(response.status).toBe(403);
  expect(state.affected).not.toHaveBeenCalled();
});
it.each([false, true])("authorizes Get updates against current pilot access: %s", async approved => {
  state.access.mockResolvedValue(approved);
  state.updates.mockResolvedValue({ following: true, affected: false, supportingEvidence: [] });
  const response = await POST(new Request("https://ayos.test/api/reports/AS-123456/engagement", { method: "POST", headers: { origin: "https://ayos.test", "content-type": "application/json" }, body: JSON.stringify({ action: "updates", active: true }) }), { params: Promise.resolve({ reference: "AS-123456" }) });
  expect(response.status).toBe(approved ? 200 : 403);
  if (approved) expect(state.updates).toHaveBeenCalledWith({ residentUid: "resident", reference: "AS-123456", active: true });
  else expect(state.updates).not.toHaveBeenCalled();
});
