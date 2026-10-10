import "server-only";

import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
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
    async submitOnce(key: string, report: StoredReport) {
      return db.runTransaction(async (transaction) => {
        const receiptRef = db.collection("submissionReceipts").doc(receiptId(key));
        const receipt = await transaction.get(receiptRef);
        if (receipt.exists) {
          return { reference: String(receipt.data()?.reference), created: false };
        }
        transaction.create(db.collection("privateReports").doc(report.private.reference), report.private);
        transaction.create(db.collection("publicReports").doc(report.public.reference), report.public);
        transaction.create(db.collection("residentNotifications").doc(receiptId(`${report.private.reporterUid}:${report.private.reference}:submitted`)), {
          id: receiptId(`${report.private.reporterUid}:${report.private.reference}:submitted`),
          residentUid: report.private.reporterUid,
          reference: report.private.reference,
          kind: "report-update",
          message: "Your report was submitted and is ready for review.",
          createdAt: report.private.submittedAt,
          read: false,
        });
        transaction.create(receiptRef, {
          reference: report.private.reference,
          residentUid: report.private.reporterUid,
          createdAt: report.private.submittedAt,
        });
        return { reference: report.private.reference, created: true };
      });
    },
    async listByResident(residentUid: string) {
      const snapshot = await db.collection("privateReports").where("reporterUid", "==", residentUid).get();
      return snapshot.docs
        .map((document) => document.data() as ResidentReport)
        .toSorted((left, right) => right.submittedAt.localeCompare(left.submittedAt));
    },
    async getPublic(reference: string) {
      const document = await db.collection("publicReports").doc(reference).get();
      return document.exists ? document.data() as PublicReportDetail : null;
    },
  };
}

export function getReportModule() {
  return createReportModule({ store: createFirebaseReportStore() });
}
