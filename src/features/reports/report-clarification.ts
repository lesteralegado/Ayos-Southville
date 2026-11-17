import type { ExactLocation } from "./report-module";
import { ModerationConflictError, ModerationForbiddenError, ModerationNotFoundError, ModerationValidationError, type ModerationReport, type ModerationStore, type Operator } from "./moderation-module";

export type ClarificationResponse = {
  explanation: string;
  description?: string;
  nearbyLandmark?: string;
  location?: { latitude: number; longitude: number };
  actorUid: string;
  occurredAt: string;
};
export type ReportClarification = {
  id: string; question: string; actorUid: string; occurredAt: string; revision: number;
  response?: ClarificationResponse;
  decision?: { outcome: "accepted" | "declined"; reason: string; actorUid: string; occurredAt: string; revision: number };
};
type Action = { reference: string; expectedRevision: number; operationId: string };
const activeStatuses = ["Submitted", "Under review", "Assigned", "In progress"];
const operatorRoles = ["Moderator", "Coordinator", "Administrator"];

export function canClarifyReport(report: { status: string; archivedAt?: string }) {
  return !report.archivedAt && activeStatuses.includes(report.status);
}

export function pendingClarification(report: Pick<ModerationReport, "clarifications">) {
  return report.clarifications?.find(request => !request.decision);
}
export function unpublishedCorrection(report: Pick<ModerationReport, "clarifications" | "clarificationPublishedRevision" | "approved">) {
  return !!report.approved && !!report.clarifications?.some(request => request.decision?.outcome === "accepted" && request.decision.revision > (report.clarificationPublishedRevision ?? 0) && request.response && (request.response.description || request.response.nearbyLandmark || request.response.location));
}

/** Original resident values remain immutable; reviewed corrections are a private draft source. */
export function reviewedReportSource(report: { description: string; nearbyLandmark: string; exactLocation?: ExactLocation; clarifications?: ReportClarification[] }) {
  let { description, nearbyLandmark, exactLocation } = report;
  for (const request of report.clarifications ?? []) {
    if (request.decision?.outcome !== "accepted" || !request.response) continue;
    description = request.response.description ?? description;
    nearbyLandmark = request.response.nearbyLandmark ?? nearbyLandmark;
    if (request.response.location) exactLocation = { ...request.response.location, privateDetails: exactLocation?.privateDetails ?? "" };
  }
  return { description, nearbyLandmark, exactLocation };
}
function text(value: unknown, label: string, limit = 1000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit) throw new ModerationValidationError(`${label} is required (up to ${limit} characters).`);
  return value.trim();
}
function operator(actor: Operator, publish = false) {
  if (!actor.roles.some(role => (publish ? ["Moderator", "Administrator"] : operatorRoles).includes(role))) throw new ModerationForbiddenError();
}
export function createClarificationModule({ store, now }: { store: ModerationStore; now: () => Date }) {
  async function load(actor: Operator, input: Action, action: string, resident = false) {
    if (!resident) operator(actor, action === "clarification-published");
    if (typeof input.reference !== "string" || !/^[A-Z0-9-]{3,80}$/.test(input.reference)) throw new ModerationValidationError("Choose a valid report reference.");
    const report = await store.getReport(input.reference);
    if (!report) throw new ModerationNotFoundError(input.reference);
    if (resident && report.reporterUid !== actor.uid) throw new ModerationForbiddenError();
    text(input.operationId, "Operation reference", 100);
    const prior = report.history.find(event => event.operationId === input.operationId);
    if (prior) {
      if (prior.actorUid !== actor.uid || prior.action !== action) throw new ModerationConflictError();
      return null;
    }
    if (!canClarifyReport(report) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision !== (report.revision ?? 0)) throw new ModerationConflictError();
    return report;
  }
  async function commit(actor: Operator, report: ModerationReport, input: Action, action: string, privateOnly = true) {
    const occurredAt = now().toISOString();
    report.history.push({ action, operationId: input.operationId, actorUid: actor.uid, occurredAt });
    const update = { en: "More information is needed for your report. Open it to respond privately.", fil: "Kailangan ng dagdag na impormasyon sa iyong ulat. Buksan ito upang sumagot nang pribado." };
    await store.commit({ actorUid: actor.uid, reports: [report], privateOnly,
      notifications: action === "clarification-requested" ? [{ residentUid: report.reporterUid, reference: report.reference, createdAt: occurredAt, message: update.en, update }] : [],
      audit: { actorUid: actor.uid, occurredAt, action: `report.${action}`, target: report.reference, reason: "Private clarification action recorded; content remains restricted." },
    });
  }
  return {
    async requestClarification(actor: Operator, input: Action & { question: string }) {
      const report = await load(actor, input, "clarification-requested");
      if (!report) return;
      if (pendingClarification(report)) throw new ModerationValidationError("Handle the current clarification before requesting another.");
      if ((report.clarifications?.length ?? 0) >= 50) throw new ModerationValidationError("Clarification limit reached.");
      const request: ReportClarification = { id: input.operationId, question: text(input.question, "Question"), actorUid: actor.uid, occurredAt: now().toISOString(), revision: input.expectedRevision };
      report.clarifications = [...(report.clarifications ?? []), request];
      await commit(actor, report, input, "clarification-requested");
    },
    async respondToClarification(actor: Operator, input: Action & { requestId: string; explanation: string; description?: string; nearbyLandmark?: string; location?: { latitude: number; longitude: number } }) {
      const report = await load(actor, input, "clarification-responded", true);
      if (!report) return;
      const request = pendingClarification(report);
      if (!request || request.id !== input.requestId || request.response) throw new ModerationConflictError();
      if (input.location && (typeof input.location !== "object" || !Number.isFinite(input.location.latitude) || !Number.isFinite(input.location.longitude) || Math.abs(input.location.latitude) > 90 || Math.abs(input.location.longitude) > 180)) throw new ModerationValidationError("Choose valid replacement coordinates.");
      request.response = { explanation: text(input.explanation, "Explanation"), actorUid: actor.uid, occurredAt: now().toISOString(),
        ...(input.description !== undefined ? { description: text(input.description, "Corrected concern") } : {}),
        ...(input.nearbyLandmark !== undefined ? { nearbyLandmark: text(input.nearbyLandmark, "Corrected landmark", 160) } : {}),
        ...(input.location ? { location: { latitude: input.location.latitude, longitude: input.location.longitude } } : {}),
      };
      await commit(actor, report, input, "clarification-responded");
    },
    async reviewClarification(actor: Operator, input: Action & { requestId: string; decision: "accepted" | "declined"; reason: string }) {
      const report = await load(actor, input, "clarification-reviewed");
      if (!report) return;
      const request = pendingClarification(report);
      if (!request || request.id !== input.requestId || !["accepted", "declined"].includes(input.decision)) throw new ModerationConflictError();
      if (input.decision === "accepted" && !request.response) throw new ModerationValidationError("Wait for the resident's response before accepting a correction.");
      request.decision = { outcome: input.decision, reason: text(input.reason, "Review reason"), actorUid: actor.uid, occurredAt: now().toISOString(), revision: input.expectedRevision + 1 };
      await commit(actor, report, input, "clarification-reviewed");
    },
    async publishClarification(actor: Operator, input: Action & { publicSummary: string; publicArea: string; privacyReviewed: boolean }) {
      const report = await load(actor, input, "clarification-published");
      if (!report) return;
      if (!unpublishedCorrection(report) || pendingClarification(report) || input.privacyReviewed !== true) throw new ModerationValidationError("Review an accepted correction and its privacy before publishing.");
      const corrected = reviewedReportSource(report);
      report.public.summary = text(input.publicSummary, "Public summary");
      report.public.area = text(input.publicArea, "Public area", 160);
      if (corrected.exactLocation) report.public.location = { latitude: corrected.exactLocation.latitude, longitude: corrected.exactLocation.longitude };
      report.clarificationPublishedRevision = input.expectedRevision + 1;
      await commit(actor, report, input, "clarification-published", false);
    },
  };
}
