import { vi } from "vitest";
import { createEngagementModule, createMemoryEngagementStore } from "@/features/reports/engagement-module";
const state = vi.hoisted(() => ({ uid: "resident", module: null as ReturnType<typeof createEngagementModule> | null }));
vi.mock("@/features/auth/session", () => ({ getVerifiedResident: async () => state.uid ? { uid: state.uid } : null }));
vi.mock("@/features/reports/firebase-engagement-store", () => ({ getEngagementModule: () => state.module }));
import { GET, PATCH } from "./route";
const request = (body: unknown, origin = "https://ayos.test") => new Request("https://ayos.test/api/notifications", { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(async () => { state.uid = "resident"; state.module = createEngagementModule({ store: createMemoryEngagementStore() }); await state.module.recordReportEvent("resident", "AS-400001", "Report accepted."); await state.module.recordReportEvent("neighbor", "AS-400002", "Neighbor report."); });
it("persists read state only for the authenticated recipient and never exposes another inbox", async () => {
  const mine = await state.module!.listNotifications("resident"); const other = await state.module!.listNotifications("neighbor");
  expect((await PATCH(request({ notificationId: other[0].id }))).status).toBe(200);
  expect((await state.module!.listNotifications("neighbor"))[0].read).toBe(false);
  expect((await PATCH(request({ notificationId: mine[0].id }))).status).toBe(200);
  const response = await GET(); const body = await response.json();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(body.notifications).toHaveLength(1); expect(body.notifications[0].read).toBe(true);
});
it("rejects cross-origin, malformed preferences, and signed-out requests", async () => {
  expect((await PATCH(request({ preferences: {} }, "https://evil.test"))).status).toBe(403);
  expect((await PATCH(request({ preferences: { emailEnabled: "true" } }))).status).toBe(422);
  expect((await PATCH(request(null))).status).toBe(422);
  state.uid = ""; expect((await GET()).status).toBe(401); expect((await PATCH(request({ notificationId: "notice" }))).status).toBe(401);
});
