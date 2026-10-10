import type { EvidenceAsset, ExactLocation, ReportCategory } from "./report-module";

export type OperatorRole = "Resident" | "Moderator" | "Coordinator" | "Administrator";
export type Operator = { uid: string; roles: readonly OperatorRole[] };
export type ModerationStatus = "Submitted" | "Under review" | "Assigned" | "In progress" | "Resolved" | "Resident confirmed" | "Rejected" | "Duplicate";
export type BilingualUpdate = { en: string; fil: string };
export type AuditEvent = { actorUid: string; occurredAt: string; action: string; target: string; reason: string };
export type ModerationNotification = { residentUid: string; reference: string; message: string; createdAt: string };
export type TimelineEvent = { action: string; status?: ModerationStatus; occurredAt: string; reason?: string; update?: BilingualUpdate };
export type ModerationReport = {
  reference: string; reporterUid: string; category: ReportCategory; description: string; nearbyLandmark: string;
  exactLocation?: ExactLocation; evidence: EvidenceAsset[]; status: ModerationStatus; submittedAt: string;
  public: { summary: string; area: string; location?: { latitude: number; longitude: number }; media: Array<{ id: string; alt: string }>; outcomeReason?: string; canonicalReference?: string };
  followers: string[]; affectedResidents: string[]; supportingEvidence: EvidenceAsset[];
  priority?: "low" | "normal" | "high" | "urgent"; destination?: string; resolutionEvidence?: EvidenceAsset[]; history: TimelineEvent[];
};
export type ModerationStore = {
  listReports(): Promise<ModerationReport[]>; getReport(reference: string): Promise<ModerationReport | null>; saveReport(report: ModerationReport): Promise<void>;
  addNotification(notification: ModerationNotification): Promise<void>; listNotifications(residentUid: string): Promise<ModerationNotification[]>;
  appendAudit(event: AuditEvent, id?: string): Promise<void>; listAudit(): Promise<AuditEvent[]>;
};
export type EmailDelivery = { residentUid: string; reference: string; subject: string; message: string };

export class ModerationForbiddenError extends Error { readonly code = "FORBIDDEN"; constructor() { super("You do not have permission to perform this action."); } }
export class ModerationValidationError extends Error { readonly code = "VALIDATION"; }
export class ModerationNotFoundError extends Error { readonly code = "NOT_FOUND"; constructor(reference: string) { super(`Report ${reference} was not found.`); } }

const moderatorRoles: OperatorRole[] = ["Moderator", "Administrator"];
const operatorRoles: OperatorRole[] = ["Moderator", "Coordinator", "Administrator"];
const unique = <T>(values: T[]) => [...new Set(values)];
function requireRole(actor: Operator, allowed: OperatorRole[]) { if (!actor.roles.some((role) => allowed.includes(role))) throw new ModerationForbiddenError(); }
function requireText(value: string, label: string) { if (typeof value !== "string" || !value.trim()) throw new ModerationValidationError(`${label} is required.`); return value.trim(); }
function requireUpdate(update: BilingualUpdate) { return { en: requireText(update?.en, "English update"), fil: requireText(update?.fil, "Filipino update") }; }
function requireStatus(report: ModerationReport, expected: ModerationStatus) { if (report.status !== expected) throw new ModerationValidationError(`A report in ${report.status} cannot make this transition.`); }
function validateResolutionEvidence(evidence: EvidenceAsset[]) { if (!Array.isArray(evidence) || evidence.length === 0 || evidence.length > 5 || evidence.some((asset) => !asset.id || !asset.name || asset.size < 0 || asset.size > 8_000_000 || asset.visibility !== "restricted" || !["image/jpeg", "image/png", "image/webp"].includes(asset.type))) throw new ModerationValidationError("Attach 1 to 5 protected resolution photos."); }

export function createModerationModule({ store, now = () => new Date(), emailEnabled = async () => false, sendEmail = async () => undefined }: { store: ModerationStore; now?: () => Date; emailEnabled?: (residentUid: string) => Promise<boolean>; sendEmail?: (delivery: EmailDelivery) => Promise<void> }) {
  async function findReport(reference: string) { const found = await store.getReport(reference); if (!found) throw new ModerationNotFoundError(reference); return found; }
  async function record(actor: Operator, action: string, target: string, reason: string) { await store.appendAudit({ actorUid: actor.uid, occurredAt: now().toISOString(), action, target, reason }); }
  async function notifyResidents(report: ModerationReport, update: BilingualUpdate, occurredAt: string) {
    const message = `${update.en} / ${update.fil}`;
    for (const residentUid of unique([report.reporterUid, ...report.followers, ...report.affectedResidents])) {
      await store.addNotification({ residentUid, reference: report.reference, message, createdAt: occurredAt });
      if (await emailEnabled(residentUid)) await sendEmail({ residentUid, reference: report.reference, subject: `Update for ${report.reference}`, message }).catch(() => undefined);
    }
  }
  return {
    async listQueue(actor: Operator) { requireRole(actor, operatorRoles); return (await store.listReports()).filter((report) => report.status === "Submitted"); },
    async getPrivateReport(actor: Operator, reference: string) { requireRole(actor, operatorRoles); return findReport(reference); },
    async getPublicReport(reference: string) {
      const report = await findReport(reference);
      if (report.status === "Duplicate") return { reference: report.reference, status: report.status, canonicalReference: report.public.canonicalReference, outcomeReason: report.public.outcomeReason };
      return { reference: report.reference, category: report.category, status: report.status, summary: report.public.summary, area: report.public.area, location: report.public.location, media: report.public.media, outcomeReason: report.public.outcomeReason, timeline: report.history.filter((event) => event.status && event.update).map((event) => ({ status: event.status, occurredAt: event.occurredAt, update: event.update })) };
    },
    async accept(actor: Operator, input: { reference: string; publicSummary: string; publicArea: string; publicLocation?: { latitude: number; longitude: number }; approvedMedia: Array<{ id: string; alt: string }>; reason: string; update?: BilingualUpdate }) {
      requireRole(actor, moderatorRoles); const report = await findReport(input.reference); requireStatus(report, "Submitted"); const reason = requireText(input.reason, "Reason"); const update = requireUpdate(input.update ?? { en: "The report was accepted for review.", fil: "Tinanggap ang ulat para sa pagsusuri." }); const occurredAt = now().toISOString();
      const allowedIds = new Set(report.evidence.map((asset) => asset.id)); if (input.approvedMedia.some((asset) => !allowedIds.has(asset.id) || !asset.alt.trim())) throw new ModerationValidationError("Only report evidence with useful alternative text can be approved.");
      report.status = "Under review"; report.public = { summary: requireText(input.publicSummary, "Public summary"), area: requireText(input.publicArea, "Public area"), location: input.publicLocation, media: input.approvedMedia.map((asset) => ({ ...asset, alt: asset.alt.trim() })) }; report.history.push({ action: "accepted", status: "Under review", occurredAt, reason, update });
      await store.saveReport(report); await notifyResidents(report, update, occurredAt); await record(actor, "report.accepted", report.reference, reason);
    },
    async reject(actor: Operator, input: { reference: string; category: "spam" | "abusive" | "emergency" | "out-of-area" | "out-of-scope"; reason: string }) {
      requireRole(actor, moderatorRoles); const report = await findReport(input.reference); requireStatus(report, "Submitted"); const reason = requireText(input.reason, "Resident-readable reason"); report.status = "Rejected"; report.public = { ...report.public, media: [], outcomeReason: reason }; report.history.push({ action: `rejected:${input.category}`, occurredAt: now().toISOString(), reason }); await store.saveReport(report); await record(actor, "report.rejected", report.reference, reason);
    },
    async merge(actor: Operator, input: { duplicateReference: string; canonicalReference: string; reason: string }) {
      requireRole(actor, moderatorRoles); if (input.duplicateReference === input.canonicalReference) throw new ModerationValidationError("A report cannot be merged into itself."); const reason = requireText(input.reason, "Merge reason"); const duplicate = await findReport(input.duplicateReference); const canonical = await findReport(input.canonicalReference); const occurredAt = now().toISOString();
      requireStatus(duplicate, "Submitted"); canonical.followers = unique([...canonical.followers, ...duplicate.followers]); canonical.affectedResidents = unique([...canonical.affectedResidents, ...duplicate.affectedResidents]); canonical.supportingEvidence = [...canonical.supportingEvidence, ...duplicate.evidence, ...duplicate.supportingEvidence]; canonical.history.push(...duplicate.history, { action: `merged-from:${duplicate.reference}`, occurredAt, reason });
      duplicate.status = "Duplicate"; duplicate.public = { summary: "This report was merged into another report.", area: duplicate.public.area, media: [], canonicalReference: canonical.reference, outcomeReason: reason }; duplicate.history.push({ action: `merged-into:${canonical.reference}`, occurredAt, reason }); await store.saveReport(canonical); await store.saveReport(duplicate);
      for (const residentUid of unique([duplicate.reporterUid, ...duplicate.followers, ...duplicate.affectedResidents])) await store.addNotification({ residentUid, reference: canonical.reference, message: `Report ${duplicate.reference} was merged into ${canonical.reference}. Follow the canonical report for updates.`, createdAt: occurredAt }); await record(actor, "report.merged", duplicate.reference, `${reason} Canonical report: ${canonical.reference}.`);
    },
    async assign(actor: Operator, input: { reference: string; priority: "low" | "normal" | "high" | "urgent"; destination: string; reason: string; update?: BilingualUpdate }) {
      requireRole(actor, ["Coordinator", "Administrator"]); const report = await findReport(input.reference); requireStatus(report, "Under review"); const reason = requireText(input.reason, "Assignment reason"); const update = requireUpdate(input.update ?? { en: reason, fil: reason }); const occurredAt = now().toISOString(); report.status = "Assigned"; report.priority = input.priority; report.destination = requireText(input.destination, "Destination"); report.history.push({ action: "assigned", status: "Assigned", occurredAt, reason, update }); await store.saveReport(report); await notifyResidents(report, update, occurredAt); await record(actor, "report.assigned", report.reference, reason);
    },
    async transition(actor: Operator, input: { reference: string; to: "In progress" | "Resolved"; update: BilingualUpdate; resolutionEvidence?: EvidenceAsset[] }) {
      requireRole(actor, ["Coordinator", "Administrator"]); const report = await findReport(input.reference); const update = requireUpdate(input.update); const occurredAt = now().toISOString();
      if (input.to === "In progress") requireStatus(report, "Assigned"); else { requireStatus(report, "In progress"); validateResolutionEvidence(input.resolutionEvidence ?? []); report.resolutionEvidence = [...(report.resolutionEvidence ?? []), ...(input.resolutionEvidence ?? [])]; }
      report.status = input.to; report.history.push({ action: `transition:${input.to}`, status: input.to, occurredAt, update }); await store.saveReport(report); await notifyResidents(report, update, occurredAt); await record(actor, input.to === "In progress" ? "report.started" : "report.resolved", report.reference, update.en);
    },
    async respondToResolution(actor: Operator, input: { reference: string; response: "confirm" | "dispute"; reason: string; update: BilingualUpdate }) {
      const report = await findReport(input.reference); if (actor.uid !== report.reporterUid) throw new ModerationForbiddenError(); requireStatus(report, "Resolved"); const reason = requireText(input.reason, "Resident reason"); const update = requireUpdate(input.update); const occurredAt = now().toISOString(); const status = input.response === "confirm" ? "Resident confirmed" : "Under review"; report.status = status; report.history.push({ action: input.response === "confirm" ? "resident-confirmed" : "resident-disputed", status, occurredAt, reason, update }); await store.saveReport(report); await notifyResidents(report, update, occurredAt); await record(actor, input.response === "confirm" ? "report.resident-confirmed" : "report.resident-disputed", report.reference, reason);
    },
    async listAudit(actor: Operator) { requireRole(actor, ["Administrator"]); return store.listAudit(); },
    listNotifications: (residentUid: string) => store.listNotifications(residentUid),
  };
}

export function createMemoryModerationStore(seed: { reports?: ModerationReport[] } = {}): ModerationStore {
  const reports = new Map((seed.reports ?? []).map((report) => [report.reference, structuredClone(report)])); const notifications: ModerationNotification[] = []; const audit = new Map<string, AuditEvent>();
  return {
    async listReports() { return [...reports.values()].map((report) => structuredClone(report)); }, async getReport(reference) { const report = reports.get(reference); return report ? structuredClone(report) : null; }, async saveReport(report) { reports.set(report.reference, structuredClone(report)); },
    async addNotification(notification) { notifications.push(structuredClone(notification)); }, async listNotifications(residentUid) { return notifications.filter((notification) => notification.residentUid === residentUid).map((notification) => structuredClone(notification)); },
    async appendAudit(event, id = crypto.randomUUID()) { if (audit.has(id)) throw new Error("Audit history is immutable."); audit.set(id, structuredClone(event)); }, async listAudit() { return [...audit.values()].map((event) => structuredClone(event)); },
  };
}