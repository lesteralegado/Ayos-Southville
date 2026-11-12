// @vitest-environment node
import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary");
  const db = firebaseBoundary(fixture.records);
  return { getFirebaseAdmin: () => ({ db }) };
});
import { changeResidentReport, listRemovalRequests } from "./resident-report-actions";
import { evidenceAvailable } from "./evidence-module";
beforeEach(() => {
  fixture.records.clear();
  process.env.AUDIT_PSEUDONYM_SECRET = "synthetic-audit-test-secret-for-withdrawal-2026";
  fixture.records.set("residentProfiles/resident", { roles: ["Resident"] });
  fixture.records.set("privateReports/AS-TEST01", { reporterUid: "resident", status: "Submitted", evidence: [{ id: "a".repeat(64) }] });
  fixture.records.set("submissionReceipts/receipt", { reference: "AS-TEST01", residentUid: "resident" });
  fixture.records.set(`evidenceUploads/${"a".repeat(64)}`, { residentUid: "resident", attachedTo: "AS-TEST01", createdAt: new Date().toISOString() });
});
it("withdraws once under concurrent retries and leaves photos inaccessible and eligible for cleanup", async () => {
  await Promise.all([changeResidentReport("resident", "AS-TEST01", "withdraw"), changeResidentReport("resident", "AS-TEST01", "withdraw")]);
  expect(fixture.records.has("privateReports/AS-TEST01")).toBe(false);
  expect(fixture.records.get("submissionReceipts/receipt")).toMatchObject({ withdrawn: true });
  const upload = fixture.records.get(`evidenceUploads/${"a".repeat(64)}`)!;
  expect(upload).toMatchObject({ deleted: true, attachedTo: "" });
  expect(evidenceAvailable(upload as never)).toBe(false);
  expect([...fixture.records.keys()].filter(key => key.startsWith("auditEvents/"))).toHaveLength(1);
});
it("refuses another resident and refuses withdrawal after publication", async () => {
  fixture.records.set("residentProfiles/other", {});
  await expect(changeResidentReport("other", "AS-TEST01", "withdraw")).rejects.toMatchObject({ status: 404 });
  fixture.records.get("privateReports/AS-TEST01")!.status = "Under review";
  await expect(changeResidentReport("resident", "AS-TEST01", "withdraw")).rejects.toMatchObject({ status: 409 });
  expect(fixture.records.has("privateReports/AS-TEST01")).toBe(true);
});
it("leaves the report, evidence and receipt intact when minimized auditing is unavailable", async () => {
  delete process.env.AUDIT_PSEUDONYM_SECRET;
  await expect(changeResidentReport("resident", "AS-TEST01", "withdraw")).rejects.toMatchObject({ status: 503 });
  expect(fixture.records.has("privateReports/AS-TEST01")).toBe(true);
  expect(fixture.records.get("submissionReceipts/receipt")?.withdrawn).toBeUndefined();
  expect(fixture.records.get(`evidenceUploads/${"a".repeat(64)}`)?.deleted).toBeUndefined();
});
it("queues a private removal request once without changing published content", async () => {
  fixture.records.get("privateReports/AS-TEST01")!.status = "Under review";
  fixture.records.set("publicReports/AS-TEST01", { publicSummary: "Safe summary", approved: true });
  await changeResidentReport("resident", "AS-TEST01", "request-removal");
  await changeResidentReport("resident", "AS-TEST01", "request-removal");
  expect(fixture.records.get("publicReports/AS-TEST01")).toEqual({ publicSummary: "Safe summary", approved: true });
  expect(await listRemovalRequests({ uid: "admin", roles: ["Administrator"] })).toMatchObject({ requests: [{ reference: "AS-TEST01", status: "requested" }] });
  await expect(listRemovalRequests({ uid: "resident", roles: ["Resident"] })).rejects.toMatchObject({ status: 403 });
});
