// @vitest-environment node
import { beforeEach, vi } from "vitest";
const fixtures = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  storageExists: true,
  pauseOnReceiptRead: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/admin/firebase-administration-store", () => ({
  getPublicPilotConfiguration: async () => ({
    categories: [{ id: "streetlights", active: true }],
  }),
}));
vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({ exists: async () => [fixtures.storageExists] }),
    }),
  }),
}));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary");
  const db = firebaseBoundary(fixtures.records, { beforeRead(path) {
    if (fixtures.pauseOnReceiptRead && path.startsWith("submissionReceipts/")) {
      fixtures.records.set("pilotOperations/current", { intakePaused: true });
      fixtures.pauseOnReceiptRead = false;
    }
  } });
  return { getFirebaseAdmin: () => ({ db, auth: { getUser: async (uid: string) => ({ uid, emailVerified: true, disabled: false }) } }) };
});
import { getReportModule } from "./firebase-report-store";
import { residentReportDetail } from "./resident-report-detail";
const assetId = "a".repeat(64);
const submission = {
  residentUid: "r1",
  idempotencyKey: "draft-submission-1234",
  category: "streetlights",
  description: "The streetlight beside the covered court no longer turns on.",
  nearbyLandmark: "Covered court",
  evidence: [
    {
      id: assetId,
      name: "forged.jpg",
      type: "image/png",
      size: 999,
      visibility: "restricted",
    },
  ],
  isEmergency: false,
  confirmNonEmergency: true,
  confirmPublicSummary: true,
};
beforeEach(() => {
  fixtures.records.clear();
  fixtures.records.set("residentProfiles/r1", { roles: ["Resident"], pilotAccess: "approved" });
  fixtures.records.set("pilotConsents/r1", { residentUid: "r1", id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T00:00:00Z", adultAcknowledged: true, locale: "en" });
  fixtures.storageExists = true;
  fixtures.pauseOnReceiptRead = false;
  process.env.FIREBASE_STORAGE_BUCKET = "private-test-bucket";
  fixtures.records.set(`evidenceUploads/${assetId}`, {
    id: assetId,
    residentUid: "r1",
    draftKey: submission.idempotencyKey,
    slotId: "photo-slot-1234",
    name: "evidence.jpg",
    type: "image/jpeg",
    size: 432,
    visibility: "restricted",
    path: "private-evidence/random/photo.jpg",
    createdAt: new Date().toISOString(),
  });
});
it("loads persisted rejection history only for the owner and omits internal reasons", async () => {
  const reports = await getReportModule();
  const receipt = await reports.submit(submission);
  const stored = fixtures.records.get(`privateReports/${receipt.reference}`)!;
  stored.status = "Rejected";
  fixtures.records.set(`moderationReports/${receipt.reference}`, { history: [
    { action: "external-follow-up", occurredAt: "2026-10-15T02:00:00Z", reason: "Internal correspondence", actorUid: "operator" },
    { action: "rejected:out-of-scope", occurredAt: "2026-10-15T03:00:00Z", reason: "Outside pilot categories", actorUid: "operator" },
  ] });
  const mine = await reports.listMine("r1");
  expect(residentReportDetail(mine[0]).timeline.at(-1)).toMatchObject({ status: "Rejected", update: { en: "Outside pilot categories" } });
  expect(JSON.stringify(mine)).not.toContain("Internal correspondence");
  expect(JSON.stringify(mine)).not.toContain("actorUid");
  expect(await reports.listMine("r2")).toEqual([]);
  expect(await reports.getPublic(receipt.reference)).toBeNull();
});

it("accepts only completed owned files and uses server metadata, then recovers the original receipt", async () => {
  const reports = await getReportModule();
  const receipt = await reports.submit(submission);
  expect((await reports.listMine("r1"))[0].evidence).toEqual([
    {
      id: assetId,
      name: "evidence.jpg",
      type: "image/jpeg",
      size: 432,
      visibility: "restricted",
    },
  ]);
  expect(await reports.submit(submission)).toEqual({
    ...receipt,
    created: false,
  });
  expect(await reports.listMine("r1")).toHaveLength(1);
});
it.each([
  "other-owner",
  "other-draft",
  "missing",
  "deleted",
  "expired",
  "missing-file",
])("denies %s evidence without creating a report", async (caseName) => {
  const upload = fixtures.records.get(`evidenceUploads/${assetId}`)!;
  if (caseName === "other-owner") upload.residentUid = "r2";
  if (caseName === "other-draft") upload.draftKey = "other-draft-1234";
  if (caseName === "missing")
    fixtures.records.delete(`evidenceUploads/${assetId}`);
  if (caseName === "deleted") upload.deleted = true;
  if (caseName === "expired") upload.createdAt = "2020-01-01T00:00:00Z";
  if (caseName === "missing-file") fixtures.storageExists = false;
  const reports = await getReportModule();
  await expect(reports.submit(submission)).rejects.toMatchObject({
    status: expect.any(Number),
  });
  expect(await reports.listMine("r1")).toEqual([]);
});

it('refuses a stale new submission during a pause but preserves an already committed receipt', async () => {
  const reports = await getReportModule();
  fixtures.records.set('pilotOperations/current', { intakePaused: true });
  await expect(reports.submit(submission)).rejects.toMatchObject({ code: 'INTAKE_PAUSED' });
  expect(await reports.listMine('r1')).toEqual([]);
  fixtures.records.set('pilotOperations/current', { intakePaused: false });
  const receipt = await reports.submit(submission);
  fixtures.records.set('pilotOperations/current', { intakePaused: true });
  expect(await reports.submit(submission)).toEqual({ ...receipt, created: false });
});
it("refuses a submission whose intake closes after its initial receipt check, then safely retries the same key", async () => {
  const reports = await getReportModule();
  fixtures.pauseOnReceiptRead = true;
  await expect(reports.submit(submission)).rejects.toMatchObject({ code: "INTAKE_PAUSED" });
  expect(await reports.listMine("r1")).toEqual([]);
  fixtures.records.set("pilotOperations/current", { intakePaused: false });
  const receipt = await reports.submit(submission);
  expect(await reports.submit(submission)).toEqual({ ...receipt, created: false });
  expect(await reports.listMine("r1")).toHaveLength(1);
});
