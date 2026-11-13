import "server-only";
import { boundedReportQuery } from "./firebase-report-pages";
import { reportPageSize } from "./report-pages";
import { pilotOperations } from "@/features/admin/pilot-operations";
import { reviewDeadline } from "./review-calendar";
import { pilotRecordsExpired } from "@/features/pilot/pilot-expiry";
import { assertIntakeOpen, assertParticipant, assertWritable, protectMutation } from "@/features/pilot/firebase-protection";

import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import { publicProjection } from "./public-projection";
import { discoveryMode, publicCollection, publicReportsRestricted } from "./firebase-discovery";
import {
  EvidenceError,
  evidenceAsset,
  evidenceAvailable,
  type EvidenceRecord,
} from "./evidence-module";
import { getEvidenceBucket } from "./firebase-evidence-store";
import {
  createReportModule,
  type ReportStore,
  type ResidentReport,
  type StoredReport,
} from "./report-module";

function receiptId(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function createFirebaseReportStore(): ReportStore {
  const db = getFirebaseAdmin().db;
  async function details(values: ResidentReport[]) {
    if (!values.length) return [];
    const [operatingDoc, ...moderation] = await db.getAll(db.collection("pilotOperations").doc("current"), ...values.map(report => db.collection("moderationReports").doc(report.reference)));
    const operating = pilotOperations(operatingDoc.data());
    return values.map((data, index) => {
      const history = (moderation[index].data()?.history ?? []) as NonNullable<ResidentReport["history"]>;
      return { ...data, history: history.map(event => ({ action: event.action, occurredAt: event.occurredAt, ...(event.status ? { status: event.status } : {}), ...(event.update ? { update: event.update } : {}), ...(event.action.startsWith("rejected:") && event.reason ? { reason: event.reason } : {}) })), reviewExpectation: { dueAt: reviewDeadline(data.submittedAt, operating.reviewCalendar), acknowledgedAt: (data as ResidentReport & { reviewAcknowledgedAt?: string }).reviewAcknowledgedAt ?? null } };
    });
  }
  return {
    async getReceipt(key) {
      if (await pilotRecordsExpired()) return null;
      const receipt = await db
        .collection("submissionReceipts")
        .doc(receiptId(key))
        .get();
      return receipt.exists
        ? { reference: String(receipt.data()?.reference), created: false, ...(receipt.data()?.withdrawn === true ? { withdrawn: true as const } : {}) }
        : null;
    },
    async submitOnce(key: string, report: StoredReport) {
      await protectMutation(report.private.reporterUid, "report");
      return db.runTransaction(async (transaction) => {
        await assertWritable(transaction, report.private.reporterUid);
        const receiptRef = db
          .collection("submissionReceipts")
          .doc(receiptId(key));
        const receipt = await transaction.get(receiptRef);
        if (receipt.exists) {
          return {
            reference: String(receipt.data()?.reference),
            created: false,
            ...(receipt.data()?.withdrawn === true ? { withdrawn: true as const } : {}),
          };
        }
        const requestedIds = report.private.evidence.map((asset) => asset.id);
        await assertParticipant(transaction, report.private.reporterUid);
        await assertIntakeOpen(transaction);
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
              !evidenceAvailable(asset) ||
              asset.attachedTo
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
      return this.listResidentWindow(residentUid, null, reportPageSize);
    },
    async listResidentWindow(residentUid, after, limit) {
      if (await pilotRecordsExpired()) return [];
      const snapshot = await boundedReportQuery(db.collection("privateReports").where("reporterUid", "==", residentUid), after, limit).get();
      return details(snapshot.docs.map(doc => ({ ...doc.data(), reference: doc.id }) as ResidentReport));
    },
    async getOwned(residentUid, reference) {
      if (!/^AS-[A-Z0-9]{1,76}$/.test(reference) || await pilotRecordsExpired()) return null;
      const doc = await db.collection("privateReports").doc(reference).get();
      if (!doc.exists || doc.data()?.reporterUid !== residentUid) return null;
      return (await details([{ ...doc.data(), reference: doc.id } as ResidentReport]))[0];
    },
    async getPublic(reference: string) {
      if (await publicReportsRestricted()) return null;
      if (await pilotRecordsExpired()) return null;
      const document = await db
        .collection(publicCollection())
        .doc(reference)
        .get();
      const value = document.data();
      return document.exists ? publicProjection({ ...value, reference }, discoveryMode()) : null;
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
