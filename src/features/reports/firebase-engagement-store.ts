import "server-only";
import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
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
      const snapshot = await db.collection("publicReports").get();
      return snapshot.docs.flatMap((document): SuggestionReport[] => {
        const value = document.data();
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
    async setResidentState(residentUid, reference, state) {
      await db
        .collection("reportEngagements")
        .doc(documentId(residentUid, reference))
        .set({
          ...state,
          residentUid,
          reference,
          updatedAt: new Date().toISOString(),
        });
    },
    async addNotificationOnce(key, notification) {
      const ref = db.collection("residentNotifications").doc(documentId(key));
      if (!(await ref.get()).exists) await ref.create(notification);
    },
    async listNotifications(residentUid) {
      const snapshot = await db
        .collection("residentNotifications")
        .where("residentUid", "==", residentUid)
        .get();
      return snapshot.docs
        .map((document) => document.data() as ResidentNotification)
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async markNotificationRead(residentUid, id) {
      const snapshot = await db
        .collection("residentNotifications")
        .where("residentUid", "==", residentUid)
        .where("id", "==", id)
        .get();
      await Promise.all(
        snapshot.docs.map((document) => document.ref.update({ read: true })),
      );
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
      await db
        .collection("notificationPreferences")
        .doc(residentUid)
        .set(preferences);
    },
  };
}

export function getEngagementModule() {
  return createEngagementModule({ store: createFirebaseEngagementStore() });
}
