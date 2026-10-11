import type { EvidenceAsset } from "./report-module";
import { evidenceLimits } from "./media-evidence";

export type EvidenceScope = {
  residentUid: string;
  draftKey: string;
  slotId: string;
};
export type PreparedPhoto = { bytes: Uint8Array; type: EvidenceAsset["type"] };
export type EvidenceRecord = EvidenceAsset &
  EvidenceScope & {
    path: string;
    createdAt: string;
    attachedTo?: string;
    deleted?: boolean;
    rejectedAt?: string;
    pilotEndedAt?: string;
  };
export type EvidenceStore = {
  saveOnce(scope: EvidenceScope, photo: PreparedPhoto): Promise<EvidenceRecord>;
  list(residentUid: string, draftKey: string): Promise<EvidenceRecord[]>;
  get(id: string): Promise<EvidenceRecord | null>;
  read(record: EvidenceRecord): Promise<Uint8Array>;
  remove(residentUid: string, id: string): Promise<void>;
};
export class EvidenceError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
  }
}
export function validDraftKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{12,128}$/.test(value);
}
export function evidenceAsset(record: EvidenceRecord): EvidenceAsset {
  const { id, name, type, size, visibility } = record;
  return { id, name, type, size, visibility };
}
export function evidenceAvailable(record: EvidenceRecord, now = Date.now()) {
  const created = Date.parse(record.createdAt);
  return !record.deleted && Number.isFinite(created)
    && (Boolean(record.attachedTo) || now - created < 86400000)
    && (record.rejectedAt === undefined || (Number.isFinite(Date.parse(record.rejectedAt)) && now - Date.parse(record.rejectedAt) < 30 * 86400000))
    && (record.pilotEndedAt === undefined || (Number.isFinite(Date.parse(record.pilotEndedAt)) && now - Date.parse(record.pilotEndedAt) < 90 * 86400000));
}

export function createEvidenceModule({
  store,
  prepare,
}: {
  store: EvidenceStore;
  prepare: (photo: PreparedPhoto) => Promise<PreparedPhoto>;
}) {
  return {
    async upload(input: EvidenceScope & { bytes: Uint8Array; type: string }) {
      if (!validDraftKey(input.draftKey) || !validDraftKey(input.slotId))
        throw new EvidenceError("Invalid upload draft.");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(input.type) ||
        input.bytes.length < 1 ||
        input.bytes.length > evidenceLimits.outputBytes
      )
        throw new EvidenceError(
          "Use a compressed JPEG, PNG, or WebP photo up to 1.6 MB.",
        );
      const photo = await prepare({
        bytes: input.bytes,
        type: input.type as EvidenceAsset["type"],
      });
      return evidenceAsset(
        await store.saveOnce(
          {
            residentUid: input.residentUid,
            draftKey: input.draftKey,
            slotId: input.slotId,
          },
          photo,
        ),
      );
    },
    async list(residentUid: string, draftKey: string) {
      if (!validDraftKey(draftKey))
        throw new EvidenceError("Invalid upload draft.");
      return (await store.list(residentUid, draftKey)).map((record) => ({
        ...evidenceAsset(record),
        slotId: record.slotId,
      }));
    },
    async read(residentUid: string, id: string, operator: boolean) {
      const record = await store.get(id);
      if (
        !record ||
        !evidenceAvailable(record) ||
        (record.residentUid !== residentUid &&
          !(operator && record.attachedTo))
      )
        throw new EvidenceError("Photo not found.", 404);
      return { bytes: await store.read(record), type: record.type };
    },
    remove: (residentUid: string, id: string) => store.remove(residentUid, id),
  };
}

export function createMemoryEvidenceStore(): EvidenceStore {
  const records = new Map<string, EvidenceRecord>();
  const files = new Map<string, Uint8Array>();
  return {
    async saveOnce(scope, photo) {
      const existing = [...records.values()].find(
        (record) =>
          record.residentUid === scope.residentUid &&
          record.draftKey === scope.draftKey &&
          record.slotId === scope.slotId,
      );
      if (existing && !existing.deleted) return existing;
      if (existing?.deleted)
        throw new EvidenceError("This photo was removed. Choose it again.");
      if (
        [...records.values()].filter(
          (r) =>
            r.residentUid === scope.residentUid &&
            r.draftKey === scope.draftKey &&
            !r.deleted,
        ).length >= evidenceLimits.count
      )
        throw new EvidenceError("Choose up to 5 photos.");
      const id = crypto.randomUUID();
      const record: EvidenceRecord = {
        ...scope,
        id,
        path: `private-evidence/${crypto.randomUUID()}`,
        name: "evidence.jpg",
        size: photo.bytes.length,
        type: photo.type,
        visibility: "restricted",
        createdAt: new Date().toISOString(),
      };
      records.set(id, record);
      files.set(record.path, photo.bytes);
      return record;
    },
    async list(uid, draft) {
      return [...records.values()].filter(
        (r) =>
          r.residentUid === uid &&
          r.draftKey === draft &&
          !r.deleted &&
          !r.attachedTo &&
          Date.now() - Date.parse(r.createdAt) < 86_400_000,
      );
    },
    async get(id) {
      return records.get(id) ?? null;
    },
    async read(record) {
      const bytes = files.get(record.path);
      if (!bytes) throw new Error("Storage unavailable.");
      return bytes;
    },
    async remove(uid, id) {
      const r = records.get(id);
      if (!r || r.residentUid !== uid)
        throw new EvidenceError("Photo not found.", 404);
      if (r.attachedTo)
        throw new EvidenceError("Submitted evidence cannot be removed.", 409);
      r.deleted = true;
      files.delete(r.path);
    },
  };
}
