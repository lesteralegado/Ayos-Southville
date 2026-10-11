// @vitest-environment node
import { beforeEach, vi } from "vitest";
const fixtures = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  storageExists: true,
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
vi.mock("@/lib/firebase/admin", () => {
  const doc = (path: string) => ({ path, get: async () => snapshot(path) });
  const snapshot = (path: string) => ({
    exists: fixtures.records.has(path),
    ref: doc(path),
    data: () => fixtures.records.get(path),
  });
  const db = {
    collection: (collection: string) => ({
      doc: (id: string) => doc(`${collection}/${id}`),
      where: (field: string, _: string, value: string) => ({
        get: async () => ({
          docs: [...fixtures.records]
            .filter(
              ([key, data]) =>
                key.startsWith(`${collection}/`) && data[field] === value,
            )
            .map(([key]) => snapshot(key)),
        }),
      }),
    }),
    runTransaction: async (
      operation: (transaction: unknown) => Promise<unknown>,
    ) => {
      const writes: (() => void)[] = [];
      const result = await operation({
        get: async (ref: { path: string }) => snapshot(ref.path),
        getAll: async (...refs: { path: string }[]) =>
          refs.map((ref) => snapshot(ref.path)),
        create: (ref: { path: string }, data: Record<string, unknown>) =>
          writes.push(() => fixtures.records.set(ref.path, data)),
        set: (ref: { path: string }, data: Record<string, unknown>) =>
          writes.push(() => fixtures.records.set(ref.path, data)),
        update: (ref: { path: string }, data: Record<string, unknown>) =>
          writes.push(() =>
            fixtures.records.set(ref.path, {
              ...fixtures.records.get(ref.path),
              ...data,
            }),
          ),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
  return { getFirebaseAdmin: () => ({ db }) };
});
import { getReportModule } from "./firebase-report-store";
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
  fixtures.records.set("residentProfiles/r1", { roles: ["Resident"] });
  fixtures.storageExists = true;
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
