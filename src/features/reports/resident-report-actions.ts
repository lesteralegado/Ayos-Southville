import "server-only";
import { createHash } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { assertWritable, minimizedAudit, protectMutation } from "@/features/pilot/firebase-protection";
import type { Operator } from "./moderation-module";

export type ResidentReportAction = "withdraw" | "request-removal";
export class ResidentReportActionError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const hashedDocumentId = (value: string) => createHash("sha256").update(value).digest("hex");

export async function changeResidentReport(uid: string, reference: string, action: ResidentReportAction) {
  if (!/^AS-[A-Z0-9]{1,76}$/.test(reference) || !["withdraw", "request-removal"].includes(action)) throw new ResidentReportActionError(422, "VALIDATION");
  await protectMutation(uid, "report");
  const db = getFirebaseAdmin().db;
  return db.runTransaction(async transaction => {
    await assertWritable(transaction, uid);
    const privateRef = db.collection("privateReports").doc(reference);
    const requestRef = db.collection("reportRequests").doc(hashedDocumentId(`${uid}:${reference}:${action}`));
    const [reportDoc, requestDoc, publicDoc, moderationDoc] = await transaction.getAll(privateRef, requestRef, db.collection("publicReports").doc(reference), db.collection("moderationReports").doc(reference));
    const previous = requestDoc.data();
    if (previous?.residentUid === uid) return { action, reference, status: previous.status };
    const report = reportDoc.data();
    if (!report || report.reporterUid !== uid) throw new ResidentReportActionError(404, "NOT_FOUND");
    const submitted = report.status === "Submitted" && !publicDoc.exists;
    if ((action === "withdraw" && !submitted) || (action === "request-removal" && (!publicDoc.exists || publicDoc.data()?.approved !== true))) throw new ResidentReportActionError(409, "CONFLICT");
    const createdAt = new Date().toISOString();
    const audit = minimizedAudit({ actorUid: uid, target: reference, action: action === "withdraw" ? "report.withdrawn" : "report.removal-requested", occurredAt: createdAt, reason: "" });
    const assetIds = action === "withdraw" && Array.isArray(report.evidence) ? report.evidence.map((asset: { id: string }) => asset.id) : [];
    if (assetIds.length > 5 || assetIds.some((asset: unknown) => typeof asset !== "string" || !/^[a-f0-9]{64}$/.test(asset))) throw new ResidentReportActionError(409, "CONFLICT");
    const uploads = assetIds.length ? await transaction.getAll(...assetIds.map((asset: string) => db.collection("evidenceUploads").doc(asset))) : [];
    const receipts = action === "withdraw" ? await transaction.get(db.collection("submissionReceipts").where("reference", "==", reference).limit(2)) : null;
    if (receipts && (receipts.size > 1 || receipts.docs.some(doc => doc.data().residentUid !== uid))) throw new ResidentReportActionError(409, "CONFLICT");
    if (uploads.some(upload => upload.exists && (upload.data()?.residentUid !== uid || upload.data()?.attachedTo !== reference))) throw new ResidentReportActionError(409, "CONFLICT");
    transaction.create(requestRef, { residentUid: uid, reference, action, status: action === "withdraw" ? "complete" : "requested", createdAt });
    transaction.create(db.collection("auditEvents").doc(), audit);
    if (action === "request-removal") transaction.update(privateRef, { removalRequestedAt: createdAt });
    if (action === "withdraw") {
      transaction.delete(privateRef);
      if (moderationDoc.exists) transaction.delete(moderationDoc.ref);
      // Preserve deduplication while recovering the actual withdrawn outcome on other devices.
      for (const receipt of receipts?.docs ?? []) transaction.update(receipt.ref, { withdrawn: true });
      // Detached tombstones deny photo access now and allow existing orphan retention cleanup.
      for (const upload of uploads) if (upload.exists) transaction.update(upload.ref, { deleted: true, attachedTo: "" });
      transaction.delete(db.collection("residentNotifications").doc(hashedDocumentId(`${uid}:${reference}:submitted`)));
    }
    return { action, reference, status: action === "withdraw" ? "complete" : "requested" };
  });
}

export async function listRemovalRequests(actor: Operator, cursor?: string | null) {
  if (!actor.roles.some(role => ["Moderator", "Coordinator", "Administrator"].includes(role))) throw new ResidentReportActionError(403, "FORBIDDEN");
  if (cursor && !/^[a-f0-9]{64}$/.test(cursor)) throw new ResidentReportActionError(422, "VALIDATION");
  let query = getFirebaseAdmin().db.collection("reportRequests").where("status", "==", "requested").orderBy(FieldPath.documentId(), "asc");
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.limit(21).get(), docs = snapshot.docs.slice(0, 20);
  return { requests: docs.map(doc => ({ reference: String(doc.data().reference), status: "requested", createdAt: String(doc.data().createdAt) })), nextCursor: snapshot.size > 20 ? docs.at(-1)!.id : null };
}
