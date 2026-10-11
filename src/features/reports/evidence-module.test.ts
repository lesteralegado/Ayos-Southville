import {
  createEvidenceModule,
  createMemoryEvidenceStore,
} from "./evidence-module";

const photo = new Uint8Array([255, 216, 255, 224]);
const scope = {
  residentUid: "r1",
  draftKey: "draft-submission-1234",
  slotId: "photo-slot-1234",
};
const prepare = async () => ({ bytes: photo, type: "image/jpeg" as const });

describe("private evidence journey", () => {
  it("denies malformed and expired evidence consistently", async () => {
    const store = createMemoryEvidenceStore(), evidence = createEvidenceModule({ store, prepare });
    const asset = await evidence.upload({ ...scope, bytes: photo, type: "image/jpeg" });
    const record = (await store.get(asset.id))!;
    record.createdAt = "invalid";
    await expect(evidence.read("r1", asset.id, false)).rejects.toMatchObject({ status: 404 });
    record.createdAt = new Date(Date.now() - 86400000).toISOString();
    await expect(evidence.read("r1", asset.id, false)).rejects.toMatchObject({ status: 404 });
    record.attachedTo = "AS-600001";
    expect(await evidence.read("r1", asset.id, false)).toMatchObject({ type: "image/jpeg" });
    record.rejectedAt = new Date(Date.now() - 30 * 86400000).toISOString();
    await expect(evidence.read("r1", asset.id, false)).rejects.toMatchObject({ status: 404 });
  });
  it("stores a real private file and recovers the same upload after an ambiguous response", async () => {
    const evidence = createEvidenceModule({
      store: createMemoryEvidenceStore(),
      prepare,
    });
    const asset = await evidence.upload({
      ...scope,
      bytes: photo,
      type: "image/jpeg",
    });
    expect(asset).toMatchObject({
      visibility: "restricted",
      size: 4,
      type: "image/jpeg",
    });
    expect(await evidence.list(scope.residentUid, scope.draftKey)).toEqual([
      { ...asset, slotId: scope.slotId },
    ]);
    expect(
      await evidence.upload({ ...scope, bytes: photo, type: "image/jpeg" }),
    ).toEqual(asset);
    expect(await evidence.read("r1", asset.id, false)).toEqual({
      bytes: photo,
      type: "image/jpeg",
    });
    await expect(evidence.read("r2", asset.id, false)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("denies unsupported, oversized, and excess files and removes drafts privately", async () => {
    const evidence = createEvidenceModule({
      store: createMemoryEvidenceStore(),
      prepare,
    });
    await expect(
      evidence.upload({ ...scope, bytes: photo, type: "text/html" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      evidence.upload({
        ...scope,
        bytes: new Uint8Array(1_600_001),
        type: "image/jpeg",
      }),
    ).rejects.toMatchObject({ status: 422 });
    const assets = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        evidence.upload({
          ...scope,
          slotId: `photo-slot-000${index}`,
          bytes: photo,
          type: "image/jpeg",
        }),
      ),
    );
    await expect(
      evidence.upload({ ...scope, bytes: photo, type: "image/jpeg" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(evidence.remove("r2", assets[0].id)).rejects.toMatchObject({
      status: 404,
    });
    await evidence.remove("r1", assets[0].id);
    expect(await evidence.list("r1", scope.draftKey)).toHaveLength(4);
    await expect(
      evidence.read("r1", assets[0].id, false),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("reports failed storage without claiming that a photo completed", async () => {
    const store = createMemoryEvidenceStore();
    const evidence = createEvidenceModule({
      store: {
        ...store,
        saveOnce: async () => {
          throw new Error("Storage unavailable");
        },
      },
      prepare,
    });
    await expect(
      evidence.upload({ ...scope, bytes: photo, type: "image/jpeg" }),
    ).rejects.toThrow("Storage unavailable");
    expect(await evidence.list("r1", scope.draftKey)).toEqual([]);
  });
});
