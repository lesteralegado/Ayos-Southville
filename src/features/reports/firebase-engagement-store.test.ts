// @vitest-environment node
import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => {
  const doc = (key: string) => ({ get: async () => ({ exists: fixture.records.has(key), data: () => fixture.records.get(key) }) });
  return { getFirebaseAdmin: () => ({ db: { collection: (name: string) => ({ doc: (id: string) => doc(name + "/" + id), where: (field: string, _op: string, value: string) => ({ get: async () => ({ docs: [...fixture.records].filter(([key,data]) => key.startsWith(name + "/") && data[field] === value).map(([,data]) => ({ data: () => data })) }) }) }) } }) };
});
import { getEngagementModule } from "./firebase-engagement-store";
it("resolves a resident's merged notification link without exposing canonical private content or another inbox", async () => {
  fixture.records.clear();
  fixture.records.set("residentNotifications/mine", { id: "mine", residentUid: "resident", reference: "AS-OLD001", kind: "report-update", message: "Merged safely.", createdAt: "2026-10-11T00:00:00Z", read: false, secret: "private internal field" });
  fixture.records.set("residentNotifications/other", { id: "other", residentUid: "neighbor", reference: "AS-OTHER1", createdAt: "2026-10-11T00:00:00Z" });
  fixture.records.set("privateReports/AS-OLD001", { status: "Duplicate", canonicalReference: "AS-NEW001", description: "Private description" });
  fixture.records.set("privateReports/AS-NEW001", { status: "Under review", description: "Private canonical description", reporterUid: "neighbor" });
  const notices = await getEngagementModule().listNotifications("resident");
  expect(notices).toHaveLength(1); expect(notices[0].reference).toBe("AS-NEW001");
  expect(JSON.stringify(notices)).not.toMatch(/description|internal|reporterUid|neighbor/);
});
