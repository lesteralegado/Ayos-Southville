import { defaultPilotOperations, type PilotOperations } from "@/features/admin/pilot-operations";
import { filterStatuses, memoryWindow, pageCursor, pagePosition, queueFilter, reportPageSize, reportScanSize, type PagePosition, type QueueFilter, type ReportPage } from "./report-pages";
import { reviewDeadline } from "./review-calendar";
import { ownedReportPage } from "./owned-report-pages";
import type {
  EvidenceAsset,
  ExactLocation,
  ReportCategory,
} from "./report-module";

export type OperatorRole =
  "Resident" | "Moderator" | "Coordinator" | "Administrator";
export type Operator = { uid: string; roles: readonly OperatorRole[] };
export type ModerationStatus =
  | "Submitted"
  | "Under review"
  | "Assigned"
  | "In progress"
  | "Resolved"
  | "Resident confirmed"
  | "Rejected"
  | "Duplicate";
export type BilingualUpdate = { en: string; fil: string };
export type AuditEvent = {
  actorUid: string;
  occurredAt: string;
  action: string;
  target: string;
  reason: string;
  operatingChange?: {
    before: { intakePaused: boolean; invitationsPaused: boolean; publicRestricted: boolean; backupAffirmed: boolean };
    after: { intakePaused: boolean; invitationsPaused: boolean; publicRestricted: boolean; backupAffirmed: boolean };
    recoveryConfirmed: boolean;
    primaryChanged: boolean;
    backupChanged: boolean;
  };
};
export type ModerationNotification = {
  residentUid: string;
  reference: string;
  message: string;
  createdAt: string;
  update?: BilingualUpdate;
};
export type TimelineEvent = {
  operationId?: string;
  actorUid?: string;
  action: string;
  status?: ModerationStatus;
  occurredAt: string;
  reason?: string;
  update?: BilingualUpdate;
};
export type ModerationReport = {
  reviewTakeoverAvailable?: boolean;
  externalFollowUp?: { phase: "forwarded" | "acknowledged" | "accepted" | "resolved"; organization: string; correspondence: string; occurredAt: string; actorUid: string; operationId: string }[];
  reviewOwnerUid?: string;
  reviewExpectation?: { dueAt: string | null; overdue: boolean; acknowledged: boolean; operatingRevision: number };
  review?: { acknowledgedAt: string; nextStep: string; actorUid: string };
  reference: string;
  reporterUid: string;
  category: ReportCategory;
  description: string;
  nearbyLandmark: string;
  exactLocation?: ExactLocation;
  evidence: EvidenceAsset[];
  status: ModerationStatus;
  submittedAt: string;
  public: {
    summary: string;
    area: string;
    location?: { latitude: number; longitude: number };
    media: Array<{ id: string; alt: string }>;
    outcomeReason?: string;
    canonicalReference?: string;
  };
  followers: string[];
  affectedResidents: string[];
  supportingEvidence: EvidenceAsset[];
  revision?: number;
  approved?: boolean;
  priority?: "low" | "normal" | "high" | "urgent";
  destination?: string;
  resolutionEvidence?: EvidenceAsset[];
  history: TimelineEvent[];
};
export type ModerationCommit = {
  operatingRevision?: number;
  reports: ModerationReport[];
  audit: AuditEvent;
  notifications: ModerationNotification[];
  actorUid: string;
};
export type ModerationStore = {
  commit(change: ModerationCommit): Promise<void>;
  listReports(): Promise<ModerationReport[]>;
  listWindow(filter: QueueFilter, after: PagePosition | null, limit: number): Promise<QueueReport[]>;
  listOwnedWindow?(uid: string, filter: QueueFilter, after: PagePosition | null, limit: number): Promise<QueueReport[]>;
  getReport(reference: string): Promise<ModerationReport | null>;
  listNotifications(residentUid: string): Promise<ModerationNotification[]>;
  appendAudit(event: AuditEvent, id?: string): Promise<void>;
  listAudit(): Promise<AuditEvent[]>;
};
export type QueueReport = Pick<ModerationReport, "reference" | "category" | "status" | "submittedAt" | "revision" | "reviewOwnerUid" | "reviewExpectation"> & { reviewAcknowledgedAt?: string };
export function queueReport(report: ModerationReport): QueueReport {
  return { reference: report.reference, category: report.category, status: report.status, submittedAt: report.submittedAt, revision: report.revision ?? 0, ...(report.reviewOwnerUid ? { reviewOwnerUid: report.reviewOwnerUid } : {}), ...(report.review?.acknowledgedAt ? { reviewAcknowledgedAt: report.review.acknowledgedAt } : {}) };
}
export type EmailDelivery = {
  residentUid: string;
  reference: string;
  subject: string;
  message: string;
};

export class ModerationForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor() {
    super("You do not have permission to perform this action.");
  }
}
export class ModerationValidationError extends Error {
  readonly code = "VALIDATION";
}
export class ModerationConflictError extends Error {
  readonly code = "CONFLICT";
  constructor() {
    super("This report changed. Reload the latest report and try again.");
  }
}
export class ModerationNotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor(reference: string) {
    super(`Report ${reference} was not found.`);
  }
}

const moderatorRoles: OperatorRole[] = ["Moderator", "Administrator"];
const operatorRoles: OperatorRole[] = [
  "Moderator",
  "Coordinator",
  "Administrator",
];
const unique = <T>(values: T[]) => [...new Set(values)];
function requireRole(actor: Operator, allowed: OperatorRole[]) {
  if (!actor.roles.some((role) => allowed.includes(role)))
    throw new ModerationForbiddenError();
}
function requireText(value: string, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 4000)
    throw new ModerationValidationError(
      `${label} is required (up to 4000 characters).`,
    );
  return value.trim();
}
function requireRevision(report: ModerationReport, expected?: number) {
  if (
    expected !== undefined &&
    (!Number.isSafeInteger(expected) || expected !== (report.revision ?? 0))
  )
    throw new ModerationConflictError();
}
function requireUpdate(update: BilingualUpdate) {
  return {
    en: requireText(update?.en, "English update"),
    fil: requireText(update?.fil, "Filipino update"),
  };
}
function requireStatus(report: ModerationReport, expected: ModerationStatus) {
  if (report.status !== expected)
    throw new ModerationValidationError(
      `A report in ${report.status} cannot make this transition.`,
    );
}
function validateResolutionEvidence(evidence: EvidenceAsset[]) {
  if (
    !Array.isArray(evidence) ||
    evidence.length === 0 ||
    evidence.length > 5 ||
    evidence.some(
      (asset) =>
        !asset ||
        !asset.id ||
        !asset.name ||
        asset.size < 0 ||
        asset.size > 8_000_000 ||
        asset.visibility !== "restricted" ||
        !["image/jpeg", "image/png", "image/webp"].includes(asset.type),
    )
  )
    throw new ModerationValidationError(
      "Attach 1 to 5 protected resolution photos.",
    );
}

export function createModerationModule({
  store,
  now = () => new Date(),
  emailEnabled = async () => false,
  sendEmail = async () => undefined,
  operations = async () => defaultPilotOperations,
}: {
  store: ModerationStore;
  now?: () => Date;
  emailEnabled?: (residentUid: string) => Promise<boolean>;
  sendEmail?: (delivery: EmailDelivery) => Promise<void>;
  operations?: () => Promise<PilotOperations>;
}) {
  async function findReport(reference: string) {
    if (typeof reference !== "string" || !/^[A-Z0-9-]{3,80}$/.test(reference))
      throw new ModerationValidationError("Choose a valid report reference.");
    const found = await store.getReport(reference);
    if (!found) throw new ModerationNotFoundError(reference);
    return found;
  }
  function reviewState(report: QueueReport, operating: PilotOperations) {
    const dueAt = reviewDeadline(report.submittedAt, operating.reviewCalendar);
    const acknowledged = !!report.reviewAcknowledgedAt || ["Rejected", "Duplicate", "Resolved", "Resident confirmed"].includes(report.status);
    return { dueAt, acknowledged, overdue: !acknowledged && !!dueAt && now().getTime() > Date.parse(dueAt), operatingRevision: operating.revision };
  }
  function withReviewExpectation(report: ModerationReport, actor: Operator, operating: PilotOperations) {
    const reviewExpectation = reviewState(queueReport(report), operating);
    return {
      ...report,
      reviewExpectation,
      reviewTakeoverAvailable: reviewExpectation.overdue && operating.backupAffirmed && operating.backupUid === actor.uid && report.reviewOwnerUid !== actor.uid,
    };
  }
  async function finish(
    actor: Operator,
    reports: ModerationReport[],
    action: string,
    reason: string,
    update?: BilingualUpdate,
    notifiedReport = reports[0],
    operatingRevision?: number,
  ) {
    const occurredAt = now().toISOString();
    const notifications = update
      ? unique([
          ...reports.flatMap(report => [report.reporterUid, ...report.followers, ...report.affectedResidents]),
        ]).map((residentUid) => ({
          residentUid,
          reference: notifiedReport.reference,
          message: `${update.en} / ${update.fil}`,
          update,
          createdAt: occurredAt,
        }))
      : [];
    await store.commit({
      ...(operatingRevision !== undefined ? { operatingRevision } : {}),
      actorUid: actor.uid,
      reports,
      notifications,
      audit: {
        actorUid: actor.uid,
        occurredAt,
        action,
        target: reports[0].reference,
        reason,
      },
    });
    for (const notification of notifications) {
      try {
        if (await emailEnabled(notification.residentUid))
          await sendEmail({
            ...notification,
            subject: `Update for ${notification.reference}`,
          });
      } catch {
        /* Persisted notifications and report changes survive optional delivery failure. */
      }
    }
  }
  return {
    async recordExternalFollowUp(actor: Operator, input: { reference: string; expectedRevision: number; operationId: string; phase: "forwarded" | "acknowledged" | "accepted" | "resolved"; organization: string; correspondence: string }) {
      requireRole(actor, ["Coordinator", "Administrator"]);
      const report = await findReport(input.reference);
      const operationId = requireText(input.operationId, "Operation reference");
      if (report.externalFollowUp?.some(event => event.operationId === operationId && event.actorUid === actor.uid)) return;
      requireRevision(report, input.expectedRevision);
      if (!["forwarded", "acknowledged", "accepted", "resolved"].includes(input.phase)) throw new ModerationValidationError("Choose the actual outside response stage.");
      if ((report.externalFollowUp?.length ?? 0) >= 100) throw new ModerationValidationError("Follow-up record limit reached.");
      const event = { phase: input.phase, organization: requireText(input.organization, "Outside organization"), correspondence: requireText(input.correspondence, "Private correspondence"), occurredAt: now().toISOString(), actorUid: actor.uid, operationId };
      report.externalFollowUp = [...(report.externalFollowUp ?? []), event];
      report.history.push({ action: "external-follow-up", operationId, actorUid: actor.uid, occurredAt: event.occurredAt });
      await finish(actor, [report], "report.external-follow-up", "Private external follow-up recorded; lifecycle unchanged.");
    },
    async acknowledgeReview(actor: Operator, input: { reference: string; expectedRevision: number; operationId: string; nextStep: string }) {
      requireRole(actor, operatorRoles);
      const report = await findReport(input.reference);
      const operationId = requireText(input.operationId, "Operation reference");
      if (report.history.some(event => event.operationId === operationId && event.actorUid === actor.uid && event.action === "review-acknowledged")) return;
      requireRevision(report, input.expectedRevision);
      if (report.review || !["Submitted", "Under review", "Assigned", "In progress"].includes(report.status)) throw new ModerationValidationError("Review already acknowledged or report inactive.");
      report.review = { acknowledgedAt: now().toISOString(), nextStep: requireText(input.nextStep, "Next-step decision"), actorUid: actor.uid };
      report.reviewOwnerUid = actor.uid;
      report.history.push({ action: "review-acknowledged", operationId, actorUid: actor.uid, occurredAt: report.review.acknowledgedAt });
      await finish(actor, [report], "report.review-acknowledged", "Actual review acknowledgement and next step recorded.");
    },

    async takeOverReview(actor: Operator, input: { reference: string; expectedRevision: number; expectedOperatingRevision: number; operationId: string; privacyReviewed: boolean; update: BilingualUpdate }) {
      requireRole(actor, operatorRoles);
      const operating = await operations();
      if (!operating.backupAffirmed || !operating.backupUid || actor.uid !== operating.backupUid) throw new ModerationForbiddenError();
      if (input.expectedOperatingRevision !== operating.revision) throw new ModerationConflictError();
      const report = await findReport(input.reference);
      const operationId = requireText(input.operationId, "Operation reference");
      if (report.history.some(event => event.operationId === operationId && event.actorUid === actor.uid && event.action === "review-takeover")) return;
      requireRevision(report, input.expectedRevision);
      const dueAt = reviewDeadline(report.submittedAt, operating.reviewCalendar);
      if (!dueAt || now().getTime() <= Date.parse(dueAt) || report.review || !["Submitted", "Under review", "Assigned", "In progress"].includes(report.status))
        throw new ModerationValidationError("Takeover requires a confirmed overdue review without acknowledgement.");
      if (report.reviewOwnerUid === actor.uid) return;
      if (input.privacyReviewed !== true) throw new ModerationValidationError("Explicitly review the English and Filipino delay update for privacy.");
      const update = requireUpdate(input.update);
      if (Object.values(update).some(text => /https?:|@|\d{5}|\b(?:block|lot)\s*\d/i.test(text))) throw new ModerationValidationError("Omit contacts, correspondence and household locations from updates.");
      report.reviewOwnerUid = actor.uid;
      report.history.push({ action: "review-takeover", operationId, actorUid: actor.uid, occurredAt: now().toISOString(), status: report.status, update });
      await finish(actor, [report], "report.review-takeover", "Backup accepted overdue review responsibility.", update, report, operating.revision);
    },
    async listWorkspace(actor: Operator) {
      requireRole(actor, operatorRoles);
      const [reports, operating] = await Promise.all([store.listReports(), operations()]);
      return reports.map(report => withReviewExpectation(report, actor, operating));
    },
    async listWorkspacePage(actor: Operator, input: { filter?: string; cursor?: string | null; ownedFirst?: boolean } = {}): Promise<ReportPage<QueueReport>> {
      requireRole(actor, operatorRoles);
      const filter = queueFilter(input.filter), scope = `operator:${actor.uid}:${filter}`;
      if (input.ownedFirst && filter !== "overdue" && store.listOwnedWindow) {
        const [page, operating] = await Promise.all([ownedReportPage({ listWindow: store.listWindow, listOwnedWindow: store.listOwnedWindow }, actor.uid, filter, input.cursor), operations()]);
        return { ...page, reports: page.reports.map(row => ({ ...row, reviewExpectation: reviewState(row, operating) })) };
      }
      const after = pagePosition(scope, input.cursor);
      const scanLimit = filter === "overdue" ? reportScanSize : reportPageSize;
      const [rows, operating] = await Promise.all([store.listWindow(filter, after, scanLimit + 1), operations()]);
      const reports: QueueReport[] = [];
      let scanned = 0;
      for (const row of rows.slice(0, scanLimit)) {
        scanned++;
        const report = { ...row, reviewExpectation: reviewState(row, operating) };
        if (filter !== "overdue" || report.reviewExpectation.overdue) reports.push(report);
        if (reports.length === reportPageSize) break;
      }
      return { reports, nextCursor: scanned && rows.length > scanned ? pageCursor(scope, rows[scanned - 1]) : null };
    },
    async listQueue(actor: Operator) {
      requireRole(actor, operatorRoles);
      return (await store.listReports()).filter(
        (report) => report.status === "Submitted",
      );
    },
    async getPrivateReport(actor: Operator, reference: string) {
      requireRole(actor, operatorRoles);
      const [report, operating] = await Promise.all([findReport(reference), operations()]);
      return withReviewExpectation(report, actor, operating);
    },
    async getPublicReport(reference: string) {
      const report = await findReport(reference);
      if (["Submitted", "Rejected"].includes(report.status))
        throw new ModerationNotFoundError(reference);
      if (report.status === "Duplicate")
        return {
          reference: report.reference,
          status: report.status,
          canonicalReference: report.public.canonicalReference,
          outcomeReason: report.public.outcomeReason,
        };
      return {
        reference: report.reference,
        category: report.category,
        status: report.status,
        summary: report.public.summary,
        area: report.public.area,
        location: report.public.location,
        media: report.public.media,
        timeline: report.history
          .filter(
            (event) =>
              event.status && event.update && event.action !== "submitted",
          )
          .map((event) => ({
            status: event.status,
            occurredAt: event.occurredAt,
            update: event.update,
          })),
      };
    },
    async accept(
      actor: Operator,
      input: {
        expectedRevision?: number;
        reference: string;
        publicSummary: string;
        publicArea: string;
        publicLocation?: { latitude: number; longitude: number };
        approvedMedia: Array<{ id: string; alt: string }>;
        reason: string;
        update?: BilingualUpdate;
      },
    ) {
      requireRole(actor, moderatorRoles);
      const report = await findReport(input.reference);
      requireRevision(report, input.expectedRevision);
      requireStatus(report, "Submitted");
      const reason = requireText(input.reason, "Reason");
      if (input.publicSummary?.length > 1000 || input.publicArea?.length > 160) throw new ModerationValidationError("Use a public summary up to 1,000 characters and an area up to 160.");
      const update = requireUpdate(
        input.update ?? {
          en: "The report was accepted for review.",
          fil: "Tinanggap ang ulat para sa pagsusuri.",
        },
      );
      const occurredAt = now().toISOString();
      const allowedIds = new Set(report.evidence.map((asset) => asset.id));
      if (
        !Array.isArray(input.approvedMedia) ||
        input.approvedMedia.some(
          (asset) =>
            !asset ||
            !allowedIds.has(asset.id) ||
            typeof asset.alt !== "string" ||
            !asset.alt.trim(),
        ) ||
        new Set(input.approvedMedia.map((asset) => asset.id)).size !==
          input.approvedMedia.length
      )
        throw new ModerationValidationError(
          "Only report evidence with useful alternative text can be approved.",
        );
      if (
        input.publicLocation &&
        (!Number.isFinite(input.publicLocation.latitude) ||
          !Number.isFinite(input.publicLocation.longitude) ||
          Math.abs(input.publicLocation.latitude) > 90 ||
          Math.abs(input.publicLocation.longitude) > 180)
      )
        throw new ModerationValidationError(
          "Choose valid approximate public coordinates.",
        );
      if (input.publicLocation)
        input.publicLocation = {
          latitude: Math.round(input.publicLocation.latitude * 100) / 100,
          longitude: Math.round(input.publicLocation.longitude * 100) / 100,
        };
      report.approved = true;
      report.status = "Under review";
      report.reviewOwnerUid = actor.uid;
      report.review ??= { acknowledgedAt: occurredAt, actorUid: actor.uid, nextStep: "Approved for public review; check the next action." };
      report.public = {
        summary: requireText(input.publicSummary, "Public summary"),
        area: requireText(input.publicArea, "Public area"),
        location: input.publicLocation,
        media: input.approvedMedia.map((asset) => ({
          ...asset,
          alt: asset.alt.trim(),
        })),
      };
      report.history.push({
        action: "accepted",
        status: "Under review",
        occurredAt,
        reason,
        update,
      });
      await finish(actor, [report], "report.accepted", reason, update);
    },
    async reject(
      actor: Operator,
      input: {
        expectedRevision?: number;
        reference: string;
        category:
          "spam" | "abusive" | "emergency" | "out-of-area" | "out-of-scope";
        reason: string;
      },
    ) {
      requireRole(actor, moderatorRoles);
      const report = await findReport(input.reference);
      requireRevision(report, input.expectedRevision);
      requireStatus(report, "Submitted");
      if (
        ![
          "spam",
          "abusive",
          "emergency",
          "out-of-area",
          "out-of-scope",
        ].includes(input.category)
      )
        throw new ModerationValidationError(
          "Choose a valid rejection category.",
        );
      const reason = requireText(input.reason, "Resident-readable reason");
      report.status = "Rejected";
      report.public = {
        summary: "",
        area: "",
        media: [],
        outcomeReason: reason,
      };
      report.history.push({
        action: `rejected:${input.category}`,
        occurredAt: now().toISOString(),
        reason,
      });
      await finish(actor, [report], "report.rejected", reason, {
        en: reason,
        fil: "Hindi tinanggap ang ulat. Tingnan ang dahilan ng operator.",
      });
    },
    async merge(
      actor: Operator,
      input: {
        expectedRevision?: number;
        canonicalRevision?: number;
        duplicateReference: string;
        canonicalReference: string;
        reason: string;
      },
    ) {
      requireRole(actor, moderatorRoles);
      if (input.duplicateReference === input.canonicalReference)
        throw new ModerationValidationError(
          "A report cannot be merged into itself.",
        );
      const reason = requireText(input.reason, "Merge reason");
      const duplicate = await findReport(input.duplicateReference);
      const canonical = await findReport(input.canonicalReference);
      const occurredAt = now().toISOString();
      requireRevision(duplicate, input.expectedRevision);
      requireRevision(canonical, input.canonicalRevision);
      requireStatus(duplicate, "Submitted");
      if (
        !["Under review", "Assigned", "In progress"].includes(canonical.status)
      )
        throw new ModerationValidationError(
          "Choose an active canonical report.",
        );
      canonical.followers = unique([
        ...canonical.followers,
        duplicate.reporterUid,
        ...duplicate.followers,
      ]);
      canonical.affectedResidents = unique([
        ...canonical.affectedResidents,
        ...duplicate.affectedResidents,
      ]);
      canonical.supportingEvidence = [
        ...canonical.supportingEvidence,
        ...duplicate.evidence,
        ...duplicate.supportingEvidence,
      ];
      canonical.history.push({
        action: `merged-from:${duplicate.reference}`,
        occurredAt,
        reason,
      });
      duplicate.status = "Duplicate";
      duplicate.public = {
        summary: "This report was merged into another report.",
        area: "",
        media: [],
        canonicalReference: canonical.reference,
        outcomeReason: reason,
      };
      duplicate.history.push({
        action: `merged-into:${canonical.reference}`,
        occurredAt,
        reason,
      });
      await finish(
        actor,
        [duplicate, canonical],
        "report.merged",
        `${reason} Canonical report: ${canonical.reference}.`,
        {
          en: `Report ${duplicate.reference} was merged into ${canonical.reference}.`,
          fil: `Pinagsama ang ulat ${duplicate.reference} sa ${canonical.reference}.`,
        },
        { ...duplicate, reference: canonical.reference },
      );
    },
    async reassignOwner(actor: Operator, input: { reference: string; expectedRevision: number; ownerUid: string; reason: string }) {
      requireRole(actor, ["Coordinator", "Administrator"]);
      const report = await findReport(input.reference);
      requireRevision(report, input.expectedRevision);
      if (!["Submitted", "Under review", "Assigned", "In progress"].includes(report.status)) throw new ModerationValidationError("Reassign only active reports.");
      const ownerUid = requireText(input.ownerUid, "Operator UID"), reason = requireText(input.reason, "Reassignment reason");
      if (ownerUid.length > 128) throw new ModerationValidationError("Choose a valid operator.");
      report.reviewOwnerUid = ownerUid;
      report.history.push({ action: "owner-reassigned", occurredAt: now().toISOString(), reason });
      await finish(actor, [report], "report.owner-reassigned", reason);
    },
    async assign(
      actor: Operator,
      input: {
        expectedRevision?: number;
        reference: string;
        priority: "low" | "normal" | "high" | "urgent";
        destination: string;
        reason: string;
        update?: BilingualUpdate;
      },
    ) {
      requireRole(actor, ["Coordinator", "Administrator"]);
      const report = await findReport(input.reference);
      requireRevision(report, input.expectedRevision);
      requireStatus(report, "Under review");
      if (!["low", "normal", "high", "urgent"].includes(input.priority))
        throw new ModerationValidationError("Choose a valid priority.");
      const reason = requireText(input.reason, "Assignment reason");
      const update = requireUpdate(input.update ?? { en: reason, fil: reason });
      const occurredAt = now().toISOString();
      report.status = "Assigned";
      report.priority = input.priority;
      report.destination = requireText(input.destination, "Destination");
      report.history.push({
        action: "assigned",
        status: "Assigned",
        occurredAt,
        reason,
        update,
      });
      await finish(actor, [report], "report.assigned", reason, update);
    },
    async transition(
      actor: Operator,
      input: {
        expectedRevision?: number;
        reference: string;
        to: "In progress" | "Resolved";
        update: BilingualUpdate;
        resolutionEvidence?: EvidenceAsset[];
      },
    ) {
      requireRole(actor, ["Coordinator", "Administrator"]);
      const report = await findReport(input.reference);
      requireRevision(report, input.expectedRevision);
      if (!["In progress", "Resolved"].includes(input.to))
        throw new ModerationValidationError("Choose a valid transition.");
      const update = requireUpdate(input.update);
      const occurredAt = now().toISOString();
      if (input.to === "In progress") {
        if (!["Under review", "Assigned"].includes(report.status)) throw new ModerationValidationError("Start work on a reviewed report.");
      }
      else {
        requireStatus(report, "In progress");
        validateResolutionEvidence(input.resolutionEvidence ?? []);
        report.resolutionEvidence = [
          ...(report.resolutionEvidence ?? []),
          ...(input.resolutionEvidence ?? []),
        ];
      }
      report.status = input.to;
      report.history.push({
        action: `transition:${input.to}`,
        status: input.to,
        occurredAt,
        update,
      });
      await finish(
        actor,
        [report],
        input.to === "In progress" ? "report.started" : "report.resolved",
        update.en,
        update,
      );
    },
    async respondToResolution(
      actor: Operator,
      input: {
        reference: string;
        expectedRevision?: number;
        response: "confirm" | "dispute";
        reason: string;
      },
    ) {
      const report = await findReport(input.reference);
      if (actor.uid !== report.reporterUid)
        throw new ModerationForbiddenError();
      requireRevision(report, input.expectedRevision);
      requireStatus(report, "Resolved");
      if (!["confirm", "dispute"].includes(input.response))
        throw new ModerationValidationError("Choose confirm or dispute.");
      const reason = requireText(input.reason, "Resident reason");
      const update = input.response === "confirm"
        ? { en: "The resident confirmed the resolution.", fil: "Kinumpirma ng residente ang resolusyon." }
        : { en: "The resident reported that the problem remains.", fil: "Iniulat ng residente na nananatili ang problema." };
      const occurredAt = now().toISOString();
      const status =
        input.response === "confirm" ? "Resident confirmed" : "Under review";
      report.status = status;
      report.history.push({
        action:
          input.response === "confirm"
            ? "resident-confirmed"
            : "resident-disputed",
        status,
        occurredAt,
        reason,
        update,
      });
      await finish(
        actor,
        [report],
        input.response === "confirm"
          ? "report.resident-confirmed"
          : "report.resident-disputed",
        reason,
        update,
      );
    },
    async listAudit(actor: Operator) {
      requireRole(actor, ["Administrator"]);
      return store.listAudit();
    },
    listNotifications: (residentUid: string) =>
      store.listNotifications(residentUid),
  };
}

export function createMemoryModerationStore(
  seed: { reports?: ModerationReport[] } = {},
): ModerationStore {
  const reports = new Map(
    (seed.reports ?? []).map((report) => [
      report.reference,
      structuredClone(report),
    ]),
  );
  const notifications: ModerationNotification[] = [];
  const audit = new Map<string, AuditEvent>();
  return {
    async commit(change) {
      for (const report of change.reports)
        if (
          (reports.get(report.reference)?.revision ?? 0) !==
          (report.revision ?? 0)
        )
          throw new ModerationConflictError();
      for (const report of change.reports)
        reports.set(
          report.reference,
          structuredClone({ ...report, revision: (report.revision ?? 0) + 1 }),
        );
      notifications.push(...structuredClone(change.notifications));
      audit.set(crypto.randomUUID(), structuredClone(change.audit));
    },
    async listReports() {
      return memoryWindow([...reports.values()].map(report => structuredClone(report)), null, reportPageSize);
    },
    async listWindow(filter, after, limit) {
      const statuses = filterStatuses(filter);
      return memoryWindow([...reports.values()].filter(report => !statuses || statuses.includes(report.status)).map(queueReport), after, limit);
    },
    async listOwnedWindow(uid, filter, after, limit) {
      const statuses = filterStatuses(filter);
      return memoryWindow([...reports.values()].filter(report => report.reviewOwnerUid === uid && (!statuses || statuses.includes(report.status))).map(queueReport), after, limit);
    },
    async getReport(reference) {
      const report = reports.get(reference);
      return report ? structuredClone(report) : null;
    },
    async listNotifications(residentUid) {
      return notifications
        .filter((notification) => notification.residentUid === residentUid)
        .map((notification) => structuredClone(notification));
    },
    async appendAudit(event, id = crypto.randomUUID()) {
      if (audit.has(id)) throw new Error("Audit history is immutable.");
      audit.set(id, structuredClone(event));
    },
    async listAudit() {
      return [...audit.values()].map((event) => structuredClone(event));
    },
  };
}
