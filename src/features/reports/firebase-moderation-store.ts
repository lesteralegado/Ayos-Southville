import "server-only";
import { pilotRecordsExpired } from "@/features/pilot/pilot-expiry";
import { assertParticipant, assertWritable, minimizedAudit, protectMutation } from "@/features/pilot/firebase-protection";
import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  createModerationModule,
  ModerationConflictError,
  ModerationValidationError,
  type AuditEvent,
  type ModerationNotification,
  type ModerationReport,
  type ModerationStore,
} from "./moderation-module";
import { evidenceAsset, evidenceAvailable, type EvidenceRecord } from "./evidence-module";
import { getEvidenceBucket } from "./firebase-evidence-store";
import {
  defaultPilotConfiguration,
  type PilotConfiguration,
} from "@/features/admin/administration-module";
import type { PublicReportDetail, ResidentReport } from "./report-module";

const documentId = (...parts: string[]) =>
  createHash("sha256").update(parts.join(":"), "utf8").digest("hex");

function createFirebaseModerationStore(): ModerationStore {
  const db = getFirebaseAdmin().db;
  async function hydrate(
    privateReport: ResidentReport,
  ): Promise<ModerationReport> {
    const publicDocument = await db
      .collection("publicReports")
      .doc(privateReport.reference)
      .get();
    const publicReport = publicDocument.data() as
      PublicReportDetail | undefined;
    const engagements = await db
      .collection("reportEngagements")
      .where("reference", "==", privateReport.reference)
      .get();
    const states = engagements.docs.map(
      (item) =>
        item.data() as {
          residentUid: string;
          affected?: boolean;
          following?: boolean;
          supportingEvidence?: ModerationReport["supportingEvidence"];
        },
    );
    const stored = (
      await db
        .collection("moderationReports")
        .doc(privateReport.reference)
        .get()
    ).data() as Partial<ModerationReport> | undefined;
    return {
      reference: privateReport.reference,
      reporterUid: privateReport.reporterUid,
      category: privateReport.category,
      description: privateReport.description,
      nearbyLandmark: privateReport.nearbyLandmark,
      exactLocation: privateReport.exactLocation,
      evidence: privateReport.evidence,
      status: stored?.status ?? privateReport.status,
      submittedAt: privateReport.submittedAt,
      public: stored?.public ?? {
        summary:
          publicReport?.publicSummary ??
          "A community concern was submitted for review.",
        area:
          publicReport?.publicArea ?? "Southville 1 Â· Location pending review",
        location: publicReport?.publicLocation,
        media: publicReport?.media ?? [],
      },
      revision: stored?.revision ?? 0,
      approved: stored?.approved ?? false,
      followers: states
        .filter((state) => state.following)
        .map((state) => state.residentUid),
      affectedResidents: states
        .filter((state) => state.affected)
        .map((state) => state.residentUid),
      supportingEvidence:
        [...new Map([
          ...(stored?.supportingEvidence ?? []),
          ...states.flatMap((state) => state.supportingEvidence ?? []),
        ].map((asset) => [asset.id, asset])).values()],
      history: stored?.history ?? [
        {
          action: "submitted",
          status: "Submitted",
          occurredAt: privateReport.submittedAt,
          update: { en: "Report submitted.", fil: "Isinumite ang ulat." },
        },
      ],
      priority: stored?.priority,
      destination: stored?.destination,
      resolutionEvidence: stored?.resolutionEvidence,
    };
  }
  return {
    async commit(change) {
      await protectMutation(change.actorUid, "operator");
      await db.runTransaction(async (transaction) => {
        const allowed = ["report.accepted", "report.rejected", "report.merged"].includes(change.audit.action) ? ["Moderator", "Administrator"] : ["report.assigned", "report.started", "report.resolved"].includes(change.audit.action) ? ["Coordinator", "Administrator"] : undefined;
        await assertWritable(transaction, change.actorUid, change.reports.flatMap(report => [report.reporterUid, ...report.followers, ...report.affectedResidents]), allowed);
        if (["report.resident-confirmed", "report.resident-disputed"].includes(change.audit.action)) await assertParticipant(transaction, change.actorUid);
        const refs = change.reports.map((report) =>
          db.collection("moderationReports").doc(report.reference),
        );
        const current = await transaction.getAll(...refs);
        for (let index = 0; index < current.length; index++) {
          if (
            (current[index].data()?.revision ?? 0) !==
            (change.reports[index].revision ?? 0)
          )
            throw new ModerationConflictError();
        }
        const engagements = await Promise.all(
          change.reports.map((report) =>
            transaction.get(
              db
                .collection("reportEngagements")
                .where("reference", "==", report.reference),
            ),
          ),
        );
        if (change.audit.action === "report.assigned") {
          const configDoc = await transaction.get(
            db.collection("pilotConfiguration").doc("current"),
          );
          const config = (configDoc.data() ??
            defaultPilotConfiguration) as PilotConfiguration;
          if (
            !config.destinations.some(
              (destination) =>
                destination.active &&
                destination.id === change.reports[0].destination,
            )
          )
            throw new ModerationValidationError(
              "Choose an active internal destination.",
            );
        }
        const resolution =
          change.audit.action === "report.resolved"
            ? change.reports[0]
            : undefined;
        const requested =
          resolution?.resolutionEvidence?.filter(
            (asset) =>
              !current[0]
                .data()
                ?.resolutionEvidence?.some(
                  (old: { id: string }) => old.id === asset.id,
                ),
          ) ?? [];
        if (
          resolution &&
          (!requested.length ||
            new Set(requested.map((asset) => asset.id)).size !==
              requested.length ||
            requested.some((asset) => !/^[a-f0-9]{64}$/.test(asset.id)))
        )
          throw new ModerationValidationError(
            "Attach completed protected resolution uploads.",
          );
        const uploads = requested.length
          ? await transaction.getAll(
              ...requested.map((asset) =>
                db.collection("evidenceUploads").doc(asset.id),
              ),
            )
          : [];
        const verified = await Promise.all(
          uploads.map(async (doc) => {
            const record = doc.data() as EvidenceRecord | undefined;
            if (
              !record ||
              !evidenceAvailable(record) ||
              record.attachedTo ||
              record.residentUid !== change.actorUid ||
              record.draftKey !== `resolution_${resolution!.reference}` ||
              !(await getEvidenceBucket().file(record.path).exists())[0]
            )
              throw new ModerationValidationError(
                "Attach completed owned resolution photos for this report.",
              );
            return record;
          }),
        );
        if (resolution)
          resolution.resolutionEvidence = [
            ...(current[0].data()?.resolutionEvidence ?? []),
            ...verified.map(evidenceAsset),
          ];
        const notifications = new Map(change.notifications.map(notice => [notice.residentUid, notice]));
        const template = change.notifications[0];
        const currentStates = engagements.flatMap(snapshot => snapshot.docs.map(doc => doc.data()));
        if (template) for (const state of currentStates)
          if (state.following || state.affected) notifications.set(state.residentUid, { ...template, residentUid: state.residentUid });
        const recipientIds = [...notifications.keys()];
        await assertWritable(transaction, change.actorUid, recipientIds);
        const preferences = recipientIds.length ? await transaction.getAll(...recipientIds.map(uid => db.collection("notificationPreferences").doc(uid))) : [];
        const preferencesByUid = new Map(recipientIds.map((uid, index) => [uid, preferences[index].data()]));
        for (let index = 0; index < change.reports.length; index++) {
          const report = change.reports[index];
          transaction.set(
            refs[index],
            JSON.parse(
              JSON.stringify({
                ...report,
                  revision: (report.revision ?? 0) + 1,
              }),
            ),
          );
          transaction.update(
            db.collection("privateReports").doc(report.reference),
            { status: report.status, ...(report.status === "Rejected" ? { rejectedAt: change.audit.occurredAt } : {}), ...(report.public.canonicalReference ? { canonicalReference: report.public.canonicalReference } : {}) },
          );
          const publicRef = db
            .collection("publicReports")
            .doc(report.reference);
          if (
            report.approved &&
            !["Submitted", "Rejected", "Duplicate"].includes(report.status)
          )
            transaction.set(
              publicRef,
              JSON.parse(
                JSON.stringify({
                  approved: true,
                  reference: report.reference,
                revision: (report.revision ?? 0) + 1,
                  category: report.category,
                  publicSummary: report.public.summary,
                  publicArea: report.public.area,
                  publicLocation: report.public.location,
                  media: report.public.media,
                  status: report.status,
                  submittedAt: report.submittedAt,
                  timeline: report.history
                    .filter(
                      (event) =>
                        event.status &&
                        event.update &&
                        event.action !== "submitted",
                    )
                    .map((event) => ({
                      status: event.status,
                      occurredAt: event.occurredAt,
                      update: event.update,
                    })),
                }),
              ),
            );
          else transaction.delete(publicRef);
        }
        for (const doc of uploads)
          transaction.update(doc.ref, { attachedTo: resolution!.reference });
        if (change.audit.action === "report.merged") {
          const canonical = change.reports[1];
          const states = engagements[1].docs.map(
            (doc) =>
              doc.data() as {
                residentUid: string;
                following: boolean;
                affected: boolean;
              },
          );
          for (const uid of new Set([
            ...canonical.followers,
            ...canonical.affectedResidents,
          ])) {
            const existing = states.find((state) => state.residentUid === uid);
            transaction.set(
              db
                .collection("reportEngagements")
                .doc(documentId(uid, canonical.reference)),
              {
                residentUid: uid,
                reference: canonical.reference,
                following:
                  !!existing?.following || canonical.followers.includes(uid),
                affected:
                  !!existing?.affected ||
                  canonical.affectedResidents.includes(uid),
              },
              { merge: true },
            );
          }
        }
        for (const notification of notifications.values()) {
          const preference = preferencesByUid.get(notification.residentUid);
          const audience = change.reports.some(report => report.reporterUid === notification.residentUid || report.affectedResidents.includes(notification.residentUid)) || currentStates.some(state => state.residentUid === notification.residentUid && state.affected) ? "status" : "follow";
          if (preference?.[audience === "status" ? "statusUpdates" : "followUpdates"] === false) continue;
          const id = documentId(
            notification.residentUid,
            change.audit.target,
            String((change.reports[0].revision ?? 0) + 1),
          );
          transaction.create(db.collection("residentNotifications").doc(id), {
            ...notification,
            id,
            kind: "report-update",
            read: false,
          });
          if (preference?.emailEnabled === true) transaction.create(db.collection("lifecycleEmailJobs").doc(id), {
            id, residentUid: notification.residentUid, reference: notification.reference,
            audience, createdAt: notification.createdAt, status: "pending", attempts: 0,
            nextAttemptAt: notification.createdAt,
          });
        }
        transaction.create(db.collection("auditEvents").doc(), minimizedAudit(change.audit));
      });
    },
    async listReports() {
      if (await pilotRecordsExpired()) return [];
      const snapshot = await db.collection("privateReports").get();
      return Promise.all(
        snapshot.docs.map((item) => hydrate(item.data() as ResidentReport)),
      );
    },
    async getReport(reference) {
      if (await pilotRecordsExpired()) return null;
      const item = await db.collection("privateReports").doc(reference).get();
      return item.exists ? hydrate(item.data() as ResidentReport) : null;
    },
    async listNotifications(residentUid) {
      const snapshot = await db
        .collection("residentNotifications")
        .where("residentUid", "==", residentUid)
        .get();
      return snapshot.docs.map((item) => item.data() as ModerationNotification);
    },
    async appendAudit(event: AuditEvent, id = crypto.randomUUID()) {
      await db.collection("auditEvents").doc(id).create(minimizedAudit(event));
    },
    async listAudit() {
      const snapshot = await db.collection("auditEvents").get();
      return snapshot.docs
        .map((item) => minimizedAudit(item.data() as AuditEvent))
        .filter(event => Date.parse(event.expiresAt) > Date.now())
        .toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    },
  };
}

export function getModerationModule() {
  return createModerationModule({
    store: createFirebaseModerationStore(),
  });
}
