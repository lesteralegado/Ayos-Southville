import "server-only";

import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import {
  EvidenceError,
  evidenceAsset,
  type EvidenceRecord,
} from "./evidence-module";
import { getEvidenceBucket } from "./firebase-evidence-store";
import {
  createReportModule,
  type PublicReportDetail,
  type ReportStore,
  type ResidentReport,
  type StoredReport,
} from "./report-module";

function receiptId(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function createFirebaseReportStore(): ReportStore {
  const db = getFirebaseAdmin().db;
  return {
    async getReceipt(key) {
      const receipt = await db
        .collection("submissionReceipts")
        .doc(receiptId(key))
        .get();
      return receipt.exists
        ? { reference: String(receipt.data()?.reference), created: false }
        : null;
    },
    async submitOnce(key: string, report: StoredReport) {
      return db.runTransaction(async (transaction) => {
        const receiptRef = db
          .collection("submissionReceipts")
          .doc(receiptId(key));
        const receipt = await transaction.get(receiptRef);
        if (receipt.exists) {
          return {
            reference: String(receipt.data()?.reference),
            created: false,
          };
        }
        const requestedIds = report.private.evidence.map((asset) => asset.id);
        if (
          new Set(requestedIds).size !== requestedIds.length ||
          requestedIds.some((id) => !/^[a-f0-9]{64}$/.test(id))
        )
          throw new EvidenceError("Choose completed owned photos.");
        const uploads = requestedIds.length
          ? await transaction.getAll(
              ...requestedIds.map((id) =>
                db.collection("evidenceUploads").doc(id),
              ),
            )
          : [];
        const verified = await Promise.all(
          uploads.map(async (doc) => {
            const asset = doc.data() as EvidenceRecord | undefined;
            const draftKey = key.slice(report.private.reporterUid.length + 1);
            if (
              !asset ||
              asset.residentUid !== report.private.reporterUid ||
              asset.draftKey !== draftKey ||
              asset.deleted ||
              asset.attachedTo ||
              Date.now() - Date.parse(asset.createdAt) >= 86_400_000
            )
              throw new EvidenceError("Choose completed owned photos.");
            if (!(await getEvidenceBucket().file(asset.path).exists())[0])
              throw new EvidenceError(
                "Photo storage could not be confirmed. Retry the upload.",
                503,
              );
            return asset;
          }),
        );
        report.private.evidence = verified.map(evidenceAsset);
        // Firestore does not accept undefined optional fields.
        if (!report.private.exactLocation) delete report.private.exactLocation;
        for (const doc of uploads)
          transaction.update(doc.ref, { attachedTo: report.private.reference });
        transaction.create(
          db.collection("privateReports").doc(report.private.reference),
          report.private,
        );
        transaction.create(
          db.collection("publicReports").doc(report.public.reference),
          report.public,
        );
        transaction.create(
          db
            .collection("residentNotifications")
            .doc(
              receiptId(
                `${report.private.reporterUid}:${report.private.reference}:submitted`,
              ),
            ),
          {
            id: receiptId(
              `${report.private.reporterUid}:${report.private.reference}:submitted`,
            ),
            residentUid: report.private.reporterUid,
            reference: report.private.reference,
            kind: "report-update",
            message: "Your report was submitted and is ready for review.",
            createdAt: report.private.submittedAt,
            read: false,
          },
        );
        transaction.create(receiptRef, {
          reference: report.private.reference,
          residentUid: report.private.reporterUid,
          createdAt: report.private.submittedAt,
        });
        return { reference: report.private.reference, created: true };
      });
    },
    async listByResident(residentUid: string) {
      const snapshot = await db
        .collection("privateReports")
        .where("reporterUid", "==", residentUid)
        .get();
      return snapshot.docs
        .map((document) => document.data() as ResidentReport)
        .toSorted((left, right) =>
          right.submittedAt.localeCompare(left.submittedAt),
        );
    },
    async getPublic(reference: string) {
      const document = await db
        .collection("publicReports")
        .doc(reference)
        .get();
      return document.exists ? (document.data() as PublicReportDetail) : null;
    },
  };
}

export async function getReportModule() {
  const configuration = await getPublicPilotConfiguration();
  return createReportModule({
    store: createFirebaseReportStore(),
    supportedCategories: configuration.categories
      .filter((category) => category.active)
      .map((category) => category.id),
  });
}
export function getReportReceipt(residentUid: string, draftKey: string) {
  return createFirebaseReportStore().getReceipt(`${residentUid}:${draftKey}`);
}
