import "server-only";
import { pilotRecordsExpired } from "@/features/pilot/pilot-expiry";
import { assertWritable, protectMutation } from "@/features/pilot/firebase-protection";
import { ProtectionError } from "@/features/pilot/security-module";
import { publicProjection } from "./public-projection";
import { EvidenceError, evidenceAsset, evidenceAvailable, type EvidenceRecord } from "./evidence-module";
import { getEvidenceBucket } from "./firebase-evidence-store";
import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getDiscoveryModule } from "./firebase-discovery";
import {
  createEngagementModule,
  type EngagementStore,
  type NotificationPreferences,
  type ResidentNotification,
  type ResidentReportState,
  type SuggestionReport,
} from "./engagement-module";

const documentId = (...parts: string[]) =>
  createHash("sha256").update(parts.join(":")).digest("hex");

function createFirebaseEngagementStore(): EngagementStore {
  const db = getFirebaseAdmin().db;
  return {
    async listSuggestionReports() {
      return (await getDiscoveryModule().all()).flatMap((value): SuggestionReport[] => {
        if (!["Under review", "Assigned", "In progress"].includes(value.status))
          return [];
        // Construct an allowlisted projection; never spread a stored document.
        return [
          {
            reference: value.reference,
            category: value.category,
            status: value.status,
            submittedAt: value.submittedAt,
            ...(value.publicLocation
              ? {
                  publicLocation: {
                    latitude: value.publicLocation.latitude,
                    longitude: value.publicLocation.longitude,
                  },
                }
              : {}),
          },
        ];
      });
    },
    async getResidentState(residentUid, reference) {
      const document = await db
        .collection("reportEngagements")
        .doc(documentId(residentUid, reference))
        .get();
      return document.exists
        ? (document.data() as ResidentReportState)
        : { affected: false, following: false, supportingEvidence: [] };
    },
    async setResidentState(residentUid, reference, state, change) {
      await protectMutation(residentUid, "engagement");
      return db.runTransaction(async transaction => {
        await assertWritable(transaction, residentUid);
        const publicDoc = await transaction.get(db.collection("publicReports").doc(reference));
        if (!publicProjection({ ...publicDoc.data(), reference })) throw new ProtectionError("FORBIDDEN", 403);
        const privateDoc = await transaction.get(db.collection("privateReports").doc(reference));
        if (!privateDoc.exists) throw new ProtectionError("FORBIDDEN", 403);
        await assertWritable(transaction, residentUid, [String(privateDoc.data()!.reporterUid)]);
        const ref = db.collection("reportEngagements").doc(documentId(residentUid, reference));
        const current = (await transaction.get(ref)).data() as ResidentReportState | undefined;
        const oldAssets = current?.supportingEvidence ?? [];
        const requested = change === "affected" && state.affected ? state.supportingEvidence.filter(asset => !oldAssets.some(old => old.id === asset.id)) : [];
        if (requested.some(asset => !/^[a-f0-9]{64}$/.test(asset.id)) || new Set(requested.map(asset => asset.id)).size !== requested.length || oldAssets.length + requested.length > 5) throw new EvidenceError("Choose up to 5 completed owned supporting photos.");
        const uploads = requested.length ? await transaction.getAll(...requested.map(asset => db.collection("evidenceUploads").doc(asset.id))) : [];
        const verified = await Promise.all(uploads.map(async doc => {
          const asset = doc.data() as EvidenceRecord | undefined;
          if (!asset || !evidenceAvailable(asset) || asset.residentUid !== residentUid || asset.draftKey !== `support_${reference}` || (asset.attachedTo && asset.attachedTo !== reference) || !(await getEvidenceBucket().file(asset.path).exists())[0]) throw new EvidenceError("Choose completed owned supporting photos for this report.");
          return evidenceAsset(asset);
        }));
        const next = { affected: change === "affected" ? state.affected : current?.affected ?? false,
          following: change === "follow" ? state.following : current?.following ?? false,
          supportingEvidence: change === "affected" && state.affected ? [...oldAssets, ...verified] : oldAssets };
        // Withdrawing the signal does not silently delete already submitted evidence.
        transaction.set(ref, { ...next, residentUid, reference, updatedAt: new Date().toISOString() });
        for (const doc of uploads) transaction.update(doc.ref, { attachedTo: reference });
        return next;
      });
    },
    async addNotificationOnce(key, notification) {
      const ref = db.collection("residentNotifications").doc(documentId(key));
      await db.runTransaction(async transaction => {
        await assertWritable(transaction, notification.residentUid);
        if (!(await transaction.get(ref)).exists) transaction.create(ref, notification);
      });
    },
    async listNotifications(residentUid) {
      if (await pilotRecordsExpired()) return [];
      const snapshot = await db
        .collection("residentNotifications")
        .where("residentUid", "==", residentUid)
        .get();
      const notices = await Promise.all(snapshot.docs.map(async document => {
        const notice = document.data() as ResidentNotification;
        let reference = notice.reference;
        const seen = new Set<string>();
        for (let depth = 0; depth < 8 && !seen.has(reference); depth++) {
          seen.add(reference);
          const report = (await db.collection("privateReports").doc(reference).get()).data();
          if (report?.status !== "Duplicate" || typeof report.canonicalReference !== "string" || !/^[A-Z0-9-]{3,80}$/.test(report.canonicalReference)) break;
          reference = report.canonicalReference;
        }
        return { id: notice.id, residentUid, reference, kind: notice.kind, message: notice.message, createdAt: notice.createdAt, read: notice.read === true, ...(notice.update ? { update: { en: notice.update.en, fil: notice.update.fil } } : {}) };
      }));
      return notices.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async markNotificationRead(residentUid, id) {
      await protectMutation(residentUid, "engagement");
      const snapshot = await db
        .collection("residentNotifications")
        .where("residentUid", "==", residentUid)
        .where("id", "==", id)
        .get();
      for (const doc of snapshot.docs) await db.runTransaction(async transaction => {
        await assertWritable(transaction, residentUid);
        const current = await transaction.get(doc.ref);
        if (current.exists && current.data()?.residentUid === residentUid) transaction.update(doc.ref, { read: true });
      });
    },
    async getPreferences(residentUid) {
      const document = await db
        .collection("notificationPreferences")
        .doc(residentUid)
        .get();
      return document.exists
        ? (document.data() as NotificationPreferences)
        : null;
    },
    async setPreferences(residentUid, preferences) {
      await protectMutation(residentUid, "engagement");
      await db.runTransaction(async transaction => {
        await assertWritable(transaction, residentUid);
        transaction.set(db.collection("notificationPreferences").doc(residentUid), preferences);
      });
    },
  };
}

export function getEngagementModule() {
  return createEngagementModule({ store: createFirebaseEngagementStore() });
}
