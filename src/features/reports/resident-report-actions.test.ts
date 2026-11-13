// @vitest-environment node
import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary");
  const db = firebaseBoundary(fixture.records);
  return { getFirebaseAdmin: () => ({ db }) };
});
import { archiveRequestedReport, changeResidentReport, listRemovalRequests } from "./resident-report-actions";
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

it("archives an approved request once while preserving private records and evidence", async () => {
  fixture.records.set("residentProfiles/admin", { roles: ["Administrator"] });
  fixture.records.set("moderationReports/AS-TEST01", { revision: 2, history: [{ action: "accepted" }] });
  fixture.records.set("publicReports/AS-TEST01", { approved: true });
  await changeResidentReport("resident", "AS-TEST01", "request-removal");
  const actor = { uid: "admin", roles: ["Administrator"] as const };
  await archiveRequestedReport(actor, "AS-TEST01", "Resident requested privacy.");
  await archiveRequestedReport(actor, "AS-TEST01", "Resident requested privacy.");
  expect(fixture.records.has("publicReports/AS-TEST01")).toBe(false);
  expect(fixture.records.get("privateReports/AS-TEST01")).toMatchObject({ reporterUid: "resident", archivedAt: expect.any(String) });
  expect(fixture.records.get("moderationReports/AS-TEST01")).toMatchObject({ revision: 3, archivedAt: expect.any(String), history: [{ action: "accepted" }, { action: "archived", reason: "Resident requested privacy." }] });
  expect(fixture.records.get(`evidenceUploads/${"a".repeat(64)}`)?.deleted).toBeUndefined();
  expect((await listRemovalRequests(actor)).requests).toHaveLength(0);
  expect([...fixture.records.keys()].filter(key => key.startsWith("auditEvents/"))).toHaveLength(2);
});

it("refuses forged operator roles, missing requests and blank archive reasons without changing public content", async () => {
  fixture.records.set("publicReports/AS-TEST01", { approved: true });
  const forged = { uid: "resident", roles: ["Administrator"] as const };
  await expect(archiveRequestedReport(forged, "AS-TEST01", "Privacy")).rejects.toMatchObject({ status: 403 });
  fixture.records.set("residentProfiles/admin", { roles: ["Administrator"] });
  const actor = { uid: "admin", roles: ["Administrator"] as const };
  fixture.records.get("residentProfiles/admin")!.pilotAccess = "revoked";
  await expect(archiveRequestedReport(actor, "AS-TEST01", "Privacy")).rejects.toMatchObject({ status: 403 });
  fixture.records.get("residentProfiles/admin")!.pilotAccess = "approved";
  await expect(archiveRequestedReport(actor, "AS-TEST01", "Privacy")).rejects.toMatchObject({ status: 404 });
  await expect(archiveRequestedReport(actor, "AS-TEST01", " ")).rejects.toMatchObject({ status: 422 });
  expect(fixture.records.get("publicReports/AS-TEST01")).toEqual({ approved: true });
});

it("rolls back archiving when the audit secret is unavailable", async () => {
  fixture.records.set("residentProfiles/admin", { roles: ["Administrator"] });
  fixture.records.set("publicReports/AS-TEST01", { approved: true });
  await changeResidentReport("resident", "AS-TEST01", "request-archive");
  delete process.env.AUDIT_PSEUDONYM_SECRET;
  await expect(archiveRequestedReport({ uid: "admin", roles: ["Administrator"] }, "AS-TEST01", "Privacy")).rejects.toMatchObject({ status: 503 });
  expect(fixture.records.get("publicReports/AS-TEST01")).toEqual({ approved: true });
  expect(fixture.records.get("privateReports/AS-TEST01")?.archivedAt).toBeUndefined();
});
