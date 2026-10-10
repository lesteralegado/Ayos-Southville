import "server-only";
import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { createModerationModule, type AuditEvent, type ModerationNotification, type ModerationReport, type ModerationStore } from "./moderation-module";
import type { PublicReportDetail, ResidentReport } from "./report-module";

const documentId = (...parts: string[]) => createHash("sha256").update(parts.join(":"), "utf8").digest("hex");

function createFirebaseModerationStore(): ModerationStore {
  const db = getFirebaseAdmin().db;
  async function hydrate(privateReport: ResidentReport): Promise<ModerationReport> {
    const publicDocument = await db.collection("publicReports").doc(privateReport.reference).get();
    const publicReport = publicDocument.data() as PublicReportDetail | undefined;
    const engagements = await db.collection("reportEngagements").where("reference", "==", privateReport.reference).get();
    const states = engagements.docs.map((item) => item.data() as { residentUid: string; affected?: boolean; following?: boolean; supportingEvidence?: ModerationReport["supportingEvidence"] });
    const stored = (await db.collection("moderationReports").doc(privateReport.reference).get()).data() as Partial<ModerationReport> | undefined;
    return {
      reference: privateReport.reference, reporterUid: privateReport.reporterUid, category: privateReport.category,
      description: privateReport.description, nearbyLandmark: privateReport.nearbyLandmark, exactLocation: privateReport.exactLocation,
      evidence: privateReport.evidence, status: stored?.status ?? privateReport.status, submittedAt: privateReport.submittedAt,
      public: stored?.public ?? { summary: publicReport?.publicSummary ?? "A community concern was submitted for review.", area: publicReport?.publicArea ?? "Southville 1 Â· Location pending review", location: publicReport?.publicLocation, media: publicReport?.media ?? [] },
      followers: stored?.followers ?? states.filter((state) => state.following).map((state) => state.residentUid),
      affectedResidents: stored?.affectedResidents ?? states.filter((state) => state.affected).map((state) => state.residentUid),
      supportingEvidence: stored?.supportingEvidence ?? states.flatMap((state) => state.supportingEvidence ?? []),
      history: stored?.history ?? [{ action: "submitted", status: "Submitted", occurredAt: privateReport.submittedAt, update: { en: "Report submitted.", fil: "Isinumite ang ulat." } }], priority: stored?.priority, destination: stored?.destination, resolutionEvidence: stored?.resolutionEvidence,
    };
  }
  return {
    async listReports() { const snapshot = await db.collection("privateReports").get(); return Promise.all(snapshot.docs.map((item) => hydrate(item.data() as ResidentReport))); },
    async getReport(reference) { const item = await db.collection("privateReports").doc(reference).get(); return item.exists ? hydrate(item.data() as ResidentReport) : null; },
    async saveReport(report) {
      const batch = db.batch();
      batch.set(db.collection("moderationReports").doc(report.reference), report);
      batch.set(db.collection("publicReports").doc(report.reference), {
        reference: report.reference, category: report.category, publicSummary: report.public.summary, publicArea: report.public.area,
        publicLocation: report.public.location, media: report.public.media, status: report.status, submittedAt: report.submittedAt,
        timeline: report.history.filter((event) => event.status).map((event) => ({ status: event.status, occurredAt: event.occurredAt, update: event.update })), outcomeReason: report.public.outcomeReason,
        canonicalReference: report.public.canonicalReference,
      });
      for (const residentUid of new Set([...report.followers, ...report.affectedResidents])) batch.set(db.collection("reportEngagements").doc(documentId(residentUid, report.reference)), { residentUid, reference: report.reference, following: report.followers.includes(residentUid), affected: report.affectedResidents.includes(residentUid), supportingEvidence: [] }, { merge: true });
      await batch.commit();
    },
    async addNotification(notification: ModerationNotification) { await db.collection("residentNotifications").doc(documentId(notification.residentUid, notification.reference, notification.message)).create({ ...notification, id: documentId(notification.residentUid, notification.reference, notification.message), kind: "report-update", read: false }); },
    async listNotifications(residentUid) { const snapshot = await db.collection("residentNotifications").where("residentUid", "==", residentUid).get(); return snapshot.docs.map((item) => item.data() as ModerationNotification); },
    async appendAudit(event: AuditEvent, id = crypto.randomUUID()) { await db.collection("auditEvents").doc(id).create(event); },
    async listAudit() { const snapshot = await db.collection("auditEvents").get(); return snapshot.docs.map((item) => item.data() as AuditEvent).toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt)); },
  };
}

export function getModerationModule() {
  const db = getFirebaseAdmin().db;
  return createModerationModule({
    store: createFirebaseModerationStore(),
    async emailEnabled(residentUid) {
      const preference = await db.collection("notificationPreferences").doc(residentUid).get();
      return preference.data()?.emailEnabled === true;
    },
    async sendEmail(delivery) {
      await db.collection("emailDeliveryRequests").doc(documentId(delivery.residentUid, delivery.reference, delivery.message)).create({ ...delivery, createdAt: new Date().toISOString(), status: "pending" });
    },
  });
}