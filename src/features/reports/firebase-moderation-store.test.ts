// @vitest-environment node
import { vi } from "vitest";
import { defaultPilotConfiguration } from "@/features/admin/administration-module";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), fileExists: true, failCommit: false }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/admin/firebase-administration-store", async () => ({ getPublicPilotConfiguration: async () => (await import("@/features/admin/administration-module")).defaultPilotConfiguration }));
vi.mock("firebase-admin/storage", () => ({ getStorage: () => ({ bucket: () => ({ file: () => ({ exists: async () => [fixture.fileExists], download: async () => [Buffer.from([1, 2, 3])] }) }) }) }));
vi.mock("@/lib/firebase/admin", () => {
  const snapshot = (key: string) => ({ exists: fixture.records.has(key), ref: doc(key), data: () => structuredClone(fixture.records.get(key)) });
  const doc = (key: string) => ({ key, get: async () => snapshot(key) });
  const query = (collection: string, field?: string, value?: unknown) => ({ get: async () => ({ docs: [...fixture.records].filter(([key, data]) => key.startsWith(collection + "/") && (!field || data[field] === value)).map(([key]) => snapshot(key)) }) });
  const db = {
    collection: (name: string) => ({ ...query(name), doc: (id = crypto.randomUUID()) => doc(name + "/" + id), where: (field: string, _op: string, value: unknown) => query(name, field, value) }),
    runTransaction: async (operation: (transaction: unknown) => Promise<unknown>) => {
      const pending: (() => void)[] = [];
      const value = await operation({
        get: async (ref: { key?: string; get: () => Promise<unknown> }) => ref.key ? snapshot(ref.key) : ref.get(),
        getAll: async (...refs: { key: string }[]) => refs.map(ref => snapshot(ref.key)),
        set: (ref: { key: string }, data: Record<string, unknown>, options?: { merge: boolean }) => pending.push(() => fixture.records.set(ref.key, structuredClone({ ...(options?.merge ? fixture.records.get(ref.key) : {}), ...data }))),
        update: (ref: { key: string }, data: Record<string, unknown>) => pending.push(() => fixture.records.set(ref.key, structuredClone({ ...fixture.records.get(ref.key), ...data }))),
        create: (ref: { key: string }, data: Record<string, unknown>) => pending.push(() => { if (fixture.records.has(ref.key)) throw new Error("Immutable record exists"); fixture.records.set(ref.key, structuredClone(data)); }),
        delete: (ref: { key: string }) => pending.push(() => fixture.records.delete(ref.key)),
      });
      if (fixture.failCommit) throw new Error("Database unavailable");
      pending.forEach(write => write()); return value;
    },
  };
  return { getFirebaseAdmin: () => ({ db }) };
});
import { getModerationModule } from "./firebase-moderation-store";
import { getReportModule } from "./firebase-report-store";
import { readApprovedPublicEvidence } from "./firebase-evidence-store";
const actor = { uid: "operator", roles: ["Administrator"] as const };
const reference = "AS-300001", originalId = "b".repeat(64), resolutionId = "a".repeat(64);
const upload = (id: string) => ({ id, name: "evidence.jpg", type: "image/jpeg", size: 500, visibility: "restricted", path: "private-evidence/file.jpg", residentUid: "operator", draftKey: "resolution_" + reference, createdAt: new Date().toISOString() });
const acceptance = { reference, expectedRevision: 0, publicSummary: "Broken light near the court.", publicArea: "Covered court", approvedMedia: [{ id: originalId, alt: "Broken streetlight" }], reason: "Private details removed." };
beforeEach(() => {
  fixture.records.clear(); fixture.fileExists = true; fixture.failCommit = false; process.env.FIREBASE_STORAGE_BUCKET = "test-private";
  process.env.AUDIT_PSEUDONYM_SECRET = "synthetic-test-key-not-production-00000000";
  for (const uid of ["operator", "resident", "duplicate-reporter", "neighbor"]) fixture.records.set("residentProfiles/" + uid, { roles: uid === "operator" ? ["Administrator"] : ["Resident"] });
  fixture.records.set("privateReports/" + reference, { reference, reporterUid: "resident", category: "streetlights", description: "Private 09171234567", nearbyLandmark: "Block 9", evidence: [{ id: originalId, name: "evidence.jpg", type: "image/jpeg", size: 500, visibility: "restricted" }], status: "Submitted", submittedAt: "2026-10-10T02:00:00Z" });
  fixture.records.set("evidenceUploads/" + originalId, { ...upload(originalId), residentUid: "resident", draftKey: "resident-draft", attachedTo: reference });
  fixture.records.set("evidenceUploads/" + resolutionId, upload(resolutionId));
  fixture.records.set("pilotConfiguration/current", defaultPilotConfiguration);
});
async function start() {
  const moderation = getModerationModule();
  await moderation.accept(actor, acceptance);
  await moderation.assign(actor, { reference, expectedRevision: 1, priority: "high", destination: "lighting", reason: "Dark walkway.", update: { en: "Assigned.", fil: "Itinalaga." } });
  await moderation.transition(actor, { reference, expectedRevision: 2, to: "In progress", update: { en: "Started.", fil: "Nagsimula." } });
  return moderation;
}
it("persists a merge notification and opt-in email for both original reporters without canonical engagement", async () => {
  const moderation = getModerationModule();
  await moderation.accept(actor, acceptance);
  const duplicateReference = "AS-300002";
  fixture.records.set("privateReports/" + duplicateReference, { ...fixture.records.get("privateReports/" + reference), reference: duplicateReference, reporterUid: "duplicate-reporter", status: "Submitted" });
  for (const uid of ["resident", "duplicate-reporter"]) fixture.records.set("notificationPreferences/" + uid, { emailEnabled: true, statusUpdates: true, followUpdates: true });
  await moderation.merge(actor, { duplicateReference, canonicalReference: reference, expectedRevision: 0, canonicalRevision: 1, reason: "Same streetlight concern." });
  expect(await moderation.listNotifications("resident")).toHaveLength(2);
  expect(await moderation.listNotifications("duplicate-reporter")).toHaveLength(1);
  const jobs = [...fixture.records].filter(([key]) => key.startsWith("lifecycleEmailJobs/")).map(([,job]) => job.residentUid).sort();
  expect(jobs).toEqual(["duplicate-reporter", "resident"]);
});
it("honors status and follow preferences while retaining an atomic email outbox", async () => {
  fixture.records.set("notificationPreferences/resident", { emailEnabled: true, statusUpdates: false, followUpdates: true });
  fixture.records.set("reportEngagements/neighbor", { reference, residentUid: "neighbor", following: true });
  fixture.records.set("notificationPreferences/neighbor", { emailEnabled: true, statusUpdates: true, followUpdates: true });
  const moderation = getModerationModule();
  await moderation.accept(actor, acceptance);
  expect(await moderation.listNotifications("resident")).toEqual([]);
  expect(await moderation.listNotifications("neighbor")).toHaveLength(1);
  const jobs = [...fixture.records].filter(([key]) => key.startsWith("lifecycleEmailJobs/"));
  expect(jobs).toHaveLength(1);
  expect(jobs[0][1]).toMatchObject({ residentUid: "neighbor", audience: "follow", status: "pending" });
});
it("includes later supporting evidence alongside retained evidence without duplicates", async () => {
  const moderation = getModerationModule();
  await moderation.accept(actor, acceptance);
  const asset = { id: "c".repeat(64), name: "support.jpg", type: "image/jpeg", size: 500, visibility: "restricted" };
  fixture.records.set("reportEngagements/new-support", { reference, residentUid: "neighbor", supportingEvidence: [asset] });
  expect((await moderation.getPrivateReport(actor, reference)).supportingEvidence).toEqual([asset]);
  const stored = fixture.records.get("moderationReports/" + reference)!;
  stored.supportingEvidence = [asset];
  expect((await moderation.getPrivateReport(actor, reference)).supportingEvidence).toEqual([asset]);
});
const resolution = { reference, expectedRevision: 3, to: "Resolved" as const, update: { en: "Light repaired.", fil: "Naayos ang ilaw." }, resolutionEvidence: [{ id: resolutionId, name: "forged.png", type: "image/png" as const, size: 1, visibility: "restricted" as const }] };
it("withholds submitted reports and serves only individually approved evidence", async () => {
  const reports = await getReportModule();
  expect(await reports.getPublic(reference)).toBeNull();
  await expect(readApprovedPublicEvidence(originalId)).rejects.toMatchObject({ status: 404 });
  await getModerationModule().accept(actor, acceptance);
  expect(await reports.getPublic(reference)).toMatchObject({ status: "Under review", media: [{ id: originalId }] });
  expect(await readApprovedPublicEvidence(originalId)).toMatchObject({ type: "image/jpeg" });
  await expect(readApprovedPublicEvidence(resolutionId)).rejects.toMatchObject({ status: 404 });
});
it("persists the full lifecycle atomically and replaces forged resolution metadata with storage truth", async () => {
  const moderation = await start();
  await moderation.transition(actor, resolution);
  expect(await moderation.getPrivateReport(actor, reference)).toMatchObject({ status: "Resolved", revision: 4, resolutionEvidence: [{ id: resolutionId, type: "image/jpeg", size: 500, name: "evidence.jpg" }] });
  expect((await (await getReportModule()).listMine("resident"))[0].status).toBe("Resolved");
  expect(await moderation.listNotifications("resident")).toHaveLength(4);
  expect(await moderation.listAudit(actor)).toHaveLength(4);
  await expect(moderation.transition(actor, resolution)).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await moderation.listAudit(actor)).toHaveLength(4);
});
it.each(["foreign", "wrong-report", "deleted", "attached", "expired", "missing-file"])("rejects %s resolution evidence without publishing a resolution", async caseName => {
  const moderation = await start();
  const record = fixture.records.get("evidenceUploads/" + resolutionId)!;
  if (caseName === "foreign") record.residentUid = "another-operator";
  if (caseName === "wrong-report") record.draftKey = "resolution_AS-OTHER";
  if (caseName === "deleted") record.deleted = true;
  if (caseName === "attached") record.attachedTo = "AS-OTHER";
  if (caseName === "expired") record.createdAt = "2020-01-01T00:00:00Z";
  if (caseName === "missing-file") fixture.fileExists = false;
  await expect(moderation.transition(actor, resolution)).rejects.toMatchObject({ code: "VALIDATION" });
  expect((await moderation.getPrivateReport(actor, reference)).status).toBe("In progress");
  expect(await moderation.listAudit(actor)).toHaveLength(3);
  expect(await moderation.listNotifications("resident")).toHaveLength(3);
});
it("rolls back a failed database action without partial audit, notifications, or public state", async () => {
  const moderation = getModerationModule(); fixture.failCommit = true;
  await expect(moderation.accept(actor, acceptance)).rejects.toThrow("Database unavailable");
  expect((await moderation.getPrivateReport(actor, reference)).status).toBe("Submitted");
  expect(await moderation.listAudit(actor)).toEqual([]);
  expect(await moderation.listNotifications("resident")).toEqual([]);
  expect(await (await getReportModule()).getPublic(reference)).toBeNull();
});
it("validates the active destination again within the commit", async () => {
  const moderation = getModerationModule(); await moderation.accept(actor, acceptance);
  await expect(moderation.assign(actor, { reference, expectedRevision: 1, priority: "high", destination: "inactive", reason: "Routing.", update: { en: "Assigned.", fil: "Itinalaga." } })).rejects.toMatchObject({ code: "VALIDATION" });
  expect((await moderation.getPrivateReport(actor, reference)).status).toBe("Under review");
});
