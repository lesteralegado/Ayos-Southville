import type { EvidenceAsset, ExactLocation, ReportCategory } from "./report-module";

export type OperatorRole = "Resident" | "Moderator" | "Coordinator" | "Administrator";
export type Operator = { uid: string; roles: readonly OperatorRole[] };
export type ModerationStatus = "Submitted" | "Under review" | "Assigned" | "Rejected" | "Duplicate";
export type AuditEvent = { actorUid: string; occurredAt: string; action: string; target: string; reason: string };
export type ModerationNotification = { residentUid: string; reference: string; message: string; createdAt: string };
export type ModerationReport = {
  reference: string; reporterUid: string; category: ReportCategory; description: string; nearbyLandmark: string;
  exactLocation?: ExactLocation; evidence: EvidenceAsset[]; status: ModerationStatus; submittedAt: string;
  public: { summary: string; area: string; location?: { latitude: number; longitude: number }; media: Array<{ id: string; alt: string }>; outcomeReason?: string; canonicalReference?: string };
  followers: string[]; affectedResidents: string[]; supportingEvidence: EvidenceAsset[];
  priority?: "low" | "normal" | "high" | "urgent"; destination?: string;
  history: Array<{ action: string; occurredAt: string; reason?: string }>;
};

export type ModerationStore = {
  listReports(): Promise<ModerationReport[]>;
  getReport(reference: string): Promise<ModerationReport | null>;
  saveReport(report: ModerationReport): Promise<void>;
  addNotification(notification: ModerationNotification): Promise<void>;
  listNotifications(residentUid: string): Promise<ModerationNotification[]>;
  appendAudit(event: AuditEvent, id?: string): Promise<void>;
  listAudit(): Promise<AuditEvent[]>;
};

export class ModerationForbiddenError extends Error { readonly code = "FORBIDDEN"; constructor() { super("You do not have permission to perform this action."); } }
export class ModerationValidationError extends Error { readonly code = "VALIDATION"; }
export class ModerationNotFoundError extends Error { readonly code = "NOT_FOUND"; constructor(reference: string) { super(`Report ${reference} was not found.`); } }

const moderatorRoles: OperatorRole[] = ["Moderator", "Administrator"];
const operatorRoles: OperatorRole[] = ["Moderator", "Coordinator", "Administrator"];
function requireRole(actor: Operator, allowed: OperatorRole[]) { if (!actor.roles.some((role) => allowed.includes(role))) throw new ModerationForbiddenError(); }
function requireText(value: string, label: string) { if (!value.trim()) throw new ModerationValidationError(`${label} is required.`); return value.trim(); }
const unique = <T>(values: T[]) => [...new Set(values)];

export function createModerationModule({ store, now = () => new Date() }: { store: ModerationStore; now?: () => Date }) {
  async function report(reference: string) { const found = await store.getReport(reference); if (!found) throw new ModerationNotFoundError(reference); return found; }
  async function record(actor: Operator, action: string, target: string, reason: string) {
    await store.appendAudit({ actorUid: actor.uid, occurredAt: now().toISOString(), action, target, reason });
  }
  return {
    async listQueue(actor: Operator) { requireRole(actor, operatorRoles); return (await store.listReports()).filter((item) => item.status === "Submitted"); },
    async getPrivateReport(actor: Operator, reference: string) { requireRole(actor, operatorRoles); return report(reference); },
    async getPublicReport(reference: string) {
      const item = await report(reference);
      if (item.status === "Duplicate") return { reference: item.reference, status: item.status, canonicalReference: item.public.canonicalReference, outcomeReason: item.public.outcomeReason };
      return { reference: item.reference, category: item.category, status: item.status, summary: item.public.summary, area: item.public.area, location: item.public.location, media: item.public.media, outcomeReason: item.public.outcomeReason };
    },
    async accept(actor: Operator, input: { reference: string; publicSummary: string; publicArea: string; publicLocation?: { latitude: number; longitude: number }; approvedMedia: Array<{ id: string; alt: string }>; reason: string }) {
      requireRole(actor, moderatorRoles); const item = await report(input.reference); const reason = requireText(input.reason, "Reason");
      const allowedIds = new Set(item.evidence.map((asset) => asset.id));
      if (input.approvedMedia.some((asset) => !allowedIds.has(asset.id) || !asset.alt.trim())) throw new ModerationValidationError("Only report evidence with useful alternative text can be approved.");
      item.status = "Under review";
      item.public = { summary: requireText(input.publicSummary, "Public summary"), area: requireText(input.publicArea, "Public area"), location: input.publicLocation, media: input.approvedMedia.map((asset) => ({ ...asset, alt: asset.alt.trim() })) };
      item.history.push({ action: "accepted", occurredAt: now().toISOString(), reason }); await store.saveReport(item); await record(actor, "report.accepted", item.reference, reason);
    },
    async reject(actor: Operator, input: { reference: string; category: "spam" | "abusive" | "emergency" | "out-of-area" | "out-of-scope"; reason: string }) {
      requireRole(actor, moderatorRoles); const item = await report(input.reference); const reason = requireText(input.reason, "Resident-readable reason");
      item.status = "Rejected"; item.public = { ...item.public, media: [], outcomeReason: reason }; item.history.push({ action: `rejected:${input.category}`, occurredAt: now().toISOString(), reason });
      await store.saveReport(item); await record(actor, "report.rejected", item.reference, reason);
    },
    async merge(actor: Operator, input: { duplicateReference: string; canonicalReference: string; reason: string }) {
      requireRole(actor, moderatorRoles); if (input.duplicateReference === input.canonicalReference) throw new ModerationValidationError("A report cannot be merged into itself.");
      const reason = requireText(input.reason, "Merge reason"); const duplicate = await report(input.duplicateReference); const canonical = await report(input.canonicalReference); const occurredAt = now().toISOString();
      canonical.followers = unique([...canonical.followers, ...duplicate.followers]); canonical.affectedResidents = unique([...canonical.affectedResidents, ...duplicate.affectedResidents]);
      canonical.supportingEvidence = [...canonical.supportingEvidence, ...duplicate.evidence, ...duplicate.supportingEvidence];
      canonical.history.push(...duplicate.history, { action: `merged-from:${duplicate.reference}`, occurredAt, reason });
      duplicate.status = "Duplicate"; duplicate.public = { summary: "This report was merged into another report.", area: duplicate.public.area, media: [], canonicalReference: canonical.reference, outcomeReason: reason };
      duplicate.history.push({ action: `merged-into:${canonical.reference}`, occurredAt, reason });
      await store.saveReport(canonical); await store.saveReport(duplicate);
      for (const residentUid of unique([duplicate.reporterUid, ...duplicate.followers, ...duplicate.affectedResidents])) await store.addNotification({ residentUid, reference: canonical.reference, message: `Report ${duplicate.reference} was merged into ${canonical.reference}. Follow the canonical report for updates.`, createdAt: occurredAt });
      await record(actor, "report.merged", duplicate.reference, `${reason} Canonical report: ${canonical.reference}.`);
    },
    async assign(actor: Operator, input: { reference: string; priority: "low" | "normal" | "high" | "urgent"; destination: string; reason: string }) {
      requireRole(actor, ["Coordinator", "Administrator"]); const item = await report(input.reference); const reason = requireText(input.reason, "Assignment reason");
      item.status = "Assigned"; item.priority = input.priority; item.destination = requireText(input.destination, "Destination"); item.history.push({ action: "assigned", occurredAt: now().toISOString(), reason });
      await store.saveReport(item); await record(actor, "report.assigned", item.reference, reason);
    },
    async listAudit(actor: Operator) { requireRole(actor, ["Administrator"]); return store.listAudit(); },
    listNotifications: (residentUid: string) => store.listNotifications(residentUid),
  };
}

export function createMemoryModerationStore(seed: { reports?: ModerationReport[] } = {}): ModerationStore {
  const reports = new Map((seed.reports ?? []).map((item) => [item.reference, structuredClone(item)])); const notifications: ModerationNotification[] = []; const audit = new Map<string, AuditEvent>();
  return {
    async listReports() { return [...reports.values()].map((item) => structuredClone(item)); },
    async getReport(reference) { const item = reports.get(reference); return item ? structuredClone(item) : null; },
    async saveReport(item) { reports.set(item.reference, structuredClone(item)); },
    async addNotification(notification) { notifications.push(structuredClone(notification)); },
    async listNotifications(residentUid) { return notifications.filter((item) => item.residentUid === residentUid).map((item) => structuredClone(item)); },
    async appendAudit(event, id = crypto.randomUUID()) { if (audit.has(id)) throw new Error("Audit history is immutable."); audit.set(id, structuredClone(event)); },
    async listAudit() { return [...audit.values()].map((item) => structuredClone(item)); },
  };
}