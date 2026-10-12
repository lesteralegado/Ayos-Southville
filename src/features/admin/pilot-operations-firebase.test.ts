// @vitest-environment node
import { beforeEach, vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), files: new Map<string, Uint8Array>(), pauseOnSave: false }));
vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/storage", () => ({ getStorage: () => ({ bucket: () => ({ file: (path: string) => ({
  save: async (bytes: Uint8Array) => {
    fixture.files.set(path, bytes);
    if (fixture.pauseOnSave) fixture.records.set("pilotOperations/current", { intakePaused: true });
  },
  exists: async () => [fixture.files.has(path)],
  delete: async () => { fixture.files.delete(path); },
}) }) }) }));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary");
  return { getFirebaseAdmin: () => ({ db: firebaseBoundary(fixture.records), auth: {
    getUser: async (uid: string) => ({ uid, emailVerified: true, disabled: false }),
    getUsers: async (ids: { uid: string }[]) => ({ users: ids.map(({ uid }) => ({ uid, emailVerified: true, disabled: false })) }),
  } }) };
});
import { getAdministrationModule } from "./firebase-administration-store";
import { getEvidenceModule } from "@/features/reports/firebase-evidence-store";
import sharp from "sharp";
import { defaultPilotOperations } from "./pilot-operations";
import { pilotParticipationClosed } from "@/features/pilot/pilot-expiry";
const admin = { uid: "admin", roles: ["Administrator"] as ["Administrator"] };
beforeEach(() => {
  fixture.records.clear();
  fixture.files.clear(); fixture.pauseOnSave = false;
  fixture.records.set("residentProfiles/admin", { roles: ["Administrator"] });
  fixture.records.set("residentProfiles/backup", { roles: ["Coordinator"] });
  process.env.AUDIT_PSEUDONYM_SECRET = "a".repeat(32);
  process.env.FIREBASE_STORAGE_BUCKET = "isolated-test";
});
it("removes a raced temporary upload and retains its draft key for a safe retry", async () => {
  const evidence = getEvidenceModule();
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer();
  const input = { residentUid: "admin", draftKey: "new-draft-123456", slotId: "photo-slot-123456", bytes, type: "image/jpeg" };
  fixture.pauseOnSave = true;
  await expect(evidence.upload(input)).rejects.toMatchObject({ code: "INTAKE_PAUSED" });
  expect(await evidence.list("admin", input.draftKey)).toEqual([]);
  expect(fixture.files.size).toBe(0);
  fixture.pauseOnSave = false; fixture.records.set("pilotOperations/current", { intakePaused: false });
  const asset = await evidence.upload(input);
  expect(await evidence.upload(input)).toEqual(asset);
  expect(await evidence.list("admin", input.draftKey)).toHaveLength(1);
});
it("allows supporting and authorized resolution photos during routine pauses, without accepting fake existing-report keys", async () => {
  fixture.records.set("pilotOperations/current", { intakePaused: true });
  fixture.records.set("publicReports/AS-ABC123", { approved: true });
  fixture.records.set("privateReports/AS-ABC123", { reporterUid: "backup" });
  const evidence = getEvidenceModule();
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer();
  for (const draftKey of ["support_AS-ABC123", "resolution_AS-ABC123"]) {
    await evidence.upload({ residentUid: "admin", draftKey, slotId: "photo-slot-123456", bytes, type: "image/jpeg" });
    expect(await evidence.list("admin", draftKey)).toHaveLength(1);
  }
  await expect(evidence.upload({ residentUid: "admin", draftKey: "support_AS-FAKE123", slotId: "photo-slot-123456", bytes, type: "image/jpeg" })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("commits one concurrent operating update and preserves unrelated retention fields", async () => {
  fixture.records.set("pilotOperations/current", { pilotEndedAt: "2026-01-01T00:00:00Z" });
  const administration = getAdministrationModule();
  const initial = await administration.getOperations(admin);
  const input = { expectedRevision: 0, operations: { ...initial, intakePaused: true, explanation: { en: "Coverage unavailable.", fil: "Walang operator." } }, recoveryConfirmed: false };
  const results = await Promise.allSettled([administration.updateOperations(admin, input), administration.updateOperations(admin, input)]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(await administration.getOperations(admin)).toMatchObject({ revision: 1, intakePaused: true });
  expect(await pilotParticipationClosed()).toBe(true);
  const audits = await administration.listAudit(admin);
  expect(audits).toHaveLength(1);
  expect(JSON.stringify(audits)).not.toContain("admin");
});
it("rejects stale administrator capabilities at commit time", async () => {
  const administration = getAdministrationModule(), initial = await administration.getOperations(admin);
  fixture.records.set("residentProfiles/admin", { roles: ["Resident"] });
  await expect(administration.updateOperations(admin, { expectedRevision: 0, operations: initial, recoveryConfirmed: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await administration.getOperations(admin)).toMatchObject({ revision: 0 });
});
it("blocks new intake photos before storage is needed during a pause", async () => {
  fixture.records.set("pilotOperations/current", { intakePaused: true });
  const evidence = getEvidenceModule();
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer();
  await expect(evidence.upload({ residentUid: "admin", draftKey: "new-draft-123456", slotId: "photo-slot-123456", bytes, type: "image/jpeg" })).rejects.toMatchObject({ code: "INTAKE_PAUSED" });
});
it("allows immediate safety suspension when previously assigned backup coverage has lost authorization", async () => {
  fixture.records.set("pilotOperations/current", { ...defaultPilotOperations, primaryUid: "admin", backupUid: "backup", backupAffirmed: true });
  fixture.records.set("residentProfiles/backup", { roles: ["Resident"] });
  const administration = getAdministrationModule(), operations = await administration.getOperations(admin);
  await administration.updateOperations(admin, { expectedRevision: 0, operations: { ...operations, intakePaused: true, publicRestricted: true, explanation: { en: "Privacy review is underway.", fil: "Sinusuri ang privacy." } }, recoveryConfirmed: false });
  expect(await administration.getOperations(admin)).toMatchObject({ intakePaused: true, publicRestricted: true });
});
