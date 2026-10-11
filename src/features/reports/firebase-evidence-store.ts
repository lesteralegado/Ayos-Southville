import "server-only";
import { pilotRecordsExpired } from "@/features/pilot/pilot-expiry";
import { assertWritable, protectMutation } from "@/features/pilot/firebase-protection";
import { createHash, randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  createEvidenceModule,
  EvidenceError,
  evidenceAvailable,
  type EvidenceScope,
  type EvidenceRecord,
  type EvidenceStore,
} from "./evidence-module";
import { prepareEvidencePhoto } from "./prepare-evidence-photo";
import { publicProjection } from "./public-projection";

const documentId = (...parts: string[]) =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex");
export async function cancelEvidenceUpload(scope: {
  residentUid: string;
  draftKey: string;
  slotId: string;
}) {
  return removeOwnedDraftUpload(
    scope.residentUid,
    documentId(scope.residentUid, scope.draftKey, scope.slotId),
    scope,
  );
}
async function removeOwnedDraftUpload(
  residentUid: string,
  id: string,
  scope?: EvidenceScope,
) {
  const db = getFirebaseAdmin().db;
  const ref = db.collection("evidenceUploads").doc(id);
  await protectMutation(residentUid, "evidence");
  const removed = await db.runTransaction(async (transaction) => {
    await assertWritable(transaction, residentUid);
    const doc = await transaction.get(ref);
    const record = doc.data() as EvidenceRecord | undefined;
    if ((!record && !scope) || (record && record.residentUid !== residentUid))
      throw new EvidenceError("Photo not found.", 404);
    if (record?.attachedTo)
      throw new EvidenceError("Submitted evidence cannot be removed.", 409);
    const draftRef = db
      .collection("evidenceDrafts")
      .doc(documentId(residentUid, record?.draftKey ?? scope!.draftKey));
    const draft = await transaction.get(draftRef);
    if (record) transaction.update(ref, { deleted: true });
    else
      transaction.create(ref, {
        ...scope,
        id,
        deleted: true,
        createdAt: new Date().toISOString(),
        path: "",
      });
    transaction.set(draftRef, {
      residentUid,
      ids: (draft.data()?.ids ?? []).filter((item: string) => item !== id),
    });
    return record;
  });
  if (removed?.path)
    await getEvidenceBucket()
      .file(removed.path)
      .delete({ ignoreNotFound: true });
}
export function getEvidenceBucket() {
  getFirebaseAdmin();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName)
    throw new Error("Private evidence storage is not configured.");
  return getStorage().bucket(bucketName);
}

export async function readApprovedPublicEvidence(id: string) {
  if (await pilotRecordsExpired()) throw new EvidenceError("Photo not found.", 404);
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new EvidenceError("Photo not found.", 404);
  const db = getFirebaseAdmin().db;
  const upload = await db.collection("evidenceUploads").doc(id).get();
  const record = upload.data() as EvidenceRecord | undefined;
  if (!record || !evidenceAvailable(record) || !record.attachedTo)
    throw new EvidenceError("Photo not found.", 404);
  const owner = await db.collection("residentProfiles").doc(record.residentUid).get();
  if (owner.data()?.deletionPending === true) throw new EvidenceError("Photo not found.", 404);
  const projection = publicProjection({ ...(
    await db.collection("publicReports").doc(record.attachedTo).get()
  ).data(), reference: record.attachedTo });
  if (
    !projection ||
    !projection.media?.some((asset: { id: string }) => asset.id === id)
  )
    throw new EvidenceError("Photo not found.", 404);
  const [bytes] = await getEvidenceBucket().file(record.path).download();
  return { bytes, type: record.type };
}

export function getEvidenceModule() {
  const db = getFirebaseAdmin().db;
  const store: EvidenceStore = {
    async saveOnce(scope, photo) {
      await protectMutation(scope.residentUid, "evidence");
      const id = documentId(scope.residentUid, scope.draftKey, scope.slotId);
      const ref = db.collection("evidenceUploads").doc(id);
      const prior = await ref.get();
      if (prior.exists) {
        const record = prior.data() as EvidenceRecord;
        if (!evidenceAvailable(record))
          throw new EvidenceError(
            "This upload is no longer available. Choose the photo again.",
            409,
          );
        return record;
      }
      const path = `private-evidence/${randomUUID()}/${randomUUID()}.jpg`;
      const file = getEvidenceBucket().file(path);
      const record: EvidenceRecord = {
        ...scope,
        id,
        name: "evidence.jpg",
        type: photo.type,
        size: photo.bytes.length,
        visibility: "restricted",
        path,
        createdAt: new Date().toISOString(),
      };
      await file.save(Buffer.from(photo.bytes), {
        resumable: false,
        metadata: {
          contentType: photo.type,
          cacheControl: "private, no-store",
        },
        preconditionOpts: { ifGenerationMatch: 0 },
      });
      try {
        const saved = await db.runTransaction(async (transaction) => {
          await assertWritable(transaction, scope.residentUid);
          const draftRef = db
            .collection("evidenceDrafts")
            .doc(documentId(scope.residentUid, scope.draftKey));
          const quotaRef = db
            .collection("evidenceQuotas")
            .doc(documentId(scope.residentUid, record.createdAt.slice(0, 10)));
          const [current, draft, quota] = await transaction.getAll(
            ref,
            draftRef,
            quotaRef,
          );
          if (current.exists) {
            const value = current.data() as EvidenceRecord;
            if (
              !evidenceAvailable(value) ||
              value.attachedTo
            )
              throw new EvidenceError(
                "This upload is no longer available. Choose the photo again.",
                409,
              );
            return value;
          }
          const priorIds: string[] = Array.isArray(draft.data()?.ids) ? draft.data()!.ids : [];
          if (priorIds.length > 5 || priorIds.some(item => typeof item !== "string" || !/^[a-f0-9]{64}$/.test(item))) throw new EvidenceError("Invalid upload draft.");
          const priorUploads = priorIds.length ? await transaction.getAll(...priorIds.map(item => db.collection("evidenceUploads").doc(item))) : [];
          const ids = priorUploads.filter(doc => {
            const value = doc.data() as EvidenceRecord | undefined;
            return value && value.residentUid === scope.residentUid && value.draftKey === scope.draftKey && evidenceAvailable(value);
          }).map(doc => doc.id);
          if (ids.length >= 5)
            throw new EvidenceError("Choose up to 5 photos.");
          const count = Number(quota.data()?.count ?? 0);
          if (count >= 50)
            throw new EvidenceError(
              "Daily photo limit reached. Try again tomorrow.",
              429,
            );
          transaction.create(ref, record);
          transaction.set(draftRef, {
            residentUid: scope.residentUid,
            ids: [...ids, id],
          });
          transaction.set(quotaRef, { residentUid: scope.residentUid, count: count + 1, expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });
          return record;
        });
        if (saved.path !== path) await file.delete({ ignoreNotFound: true });
        return saved;
      } catch (error) {
        await file.delete({ ignoreNotFound: true }).catch(() => undefined);
        throw error;
      }
    },
    async list(residentUid, draftKey) {
      const snapshot = await db
        .collection("evidenceUploads")
        .where("residentUid", "==", residentUid)
        .where("draftKey", "==", draftKey)
        .get();
      return snapshot.docs
        .map((doc) => doc.data() as EvidenceRecord)
        .filter(
          (r) =>
            evidenceAvailable(r) && !r.attachedTo,
        );
    },
    async get(id) {
      if (!/^[a-f0-9]{64}$/.test(id)) return null;
      const doc = await db.collection("evidenceUploads").doc(id).get();
      if (!doc.exists) return null;
      const record = doc.data() as EvidenceRecord;
      const [profile, operations, report] = await Promise.all([
        db.collection("residentProfiles").doc(record.residentUid).get(),
        db.collection("pilotOperations").doc("current").get(),
        record.attachedTo ? db.collection("privateReports").doc(record.attachedTo).get() : Promise.resolve(null),
      ]);
      if (profile.data()?.deletionPending === true) return null;
      return { ...record, ...(operations.data()?.pilotEndedAt ? { pilotEndedAt: operations.data()!.pilotEndedAt } : {}), ...(report?.data()?.status === "Rejected" ? { rejectedAt: report.data()!.rejectedAt ?? "" } : {}) };
    },
    async read(record) {
      const [bytes] = await getEvidenceBucket().file(record.path).download();
      return bytes;
    },
    async remove(residentUid, id) {
      if (!/^[a-f0-9]{64}$/.test(id))
        throw new EvidenceError("Photo not found.", 404);
      await removeOwnedDraftUpload(residentUid, id);
    },
  };
  return createEvidenceModule({ store, prepare: prepareEvidencePhoto });
}
