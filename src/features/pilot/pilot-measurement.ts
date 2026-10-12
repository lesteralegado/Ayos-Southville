import type { Operator } from "@/features/reports/moderation-module";

export const outcomeFields = ["submitted", "assisted", "understoodStatus", "foundDuplicate", "completedLifecycle"] as const;
export type MeasurementSource = "real" | "exercise" | "unknown";
export type MeasurementRecord = { participantCode: string; source: MeasurementSource; consentConfirmed: boolean; revision: number; createdAt: string; updatedAt: string } & Record<typeof outcomeFields[number], boolean | null>;
export type TrialReview = { week: number; decision: "continue" | "pause" | "expand" | "stop"; capacity: number; coverageReviewed: boolean; safetyReviewed: boolean; evidenceCode: string; recordedAt: string };
export type PilotTrial = { revision: number; startedAt: string; plannedThrough: string; releaseApprovedAt: string; evidenceCode: string; capacity: number; reviews?: TrialReview[] };
export type MeasurementErasure = { participantCode: string; source: MeasurementSource; expectedRevision: number; evidenceCode: string; erasedAt: string };
export type PilotMeasurementStore = { save(record: MeasurementRecord, actor: Operator, expectedRevision: number): Promise<void>; erase(input: MeasurementErasure, actor: Operator): Promise<void>; list(): Promise<unknown[]>; trial(): Promise<PilotTrial | null>; saveTrial(trial: PilotTrial, actor: Operator, expectedRevision: number): Promise<void> };
export class PilotMeasurementForbiddenError extends Error { readonly code = "FORBIDDEN"; }
export class PilotMeasurementValidationError extends Error { readonly code = "VALIDATION"; }
export class PilotMeasurementConflictError extends Error { readonly code = "CONFLICT"; }
function requireAdministrator(actor: Operator) { if (!actor.roles.includes("Administrator")) throw new PilotMeasurementForbiddenError("Administrator capability is required."); }
const object = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const timestamp = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
function safeTrial(input: unknown): PilotTrial | null {
  const value = object(input);
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) < 1 || !timestamp(value.startedAt) || !timestamp(value.plannedThrough) || !timestamp(value.releaseApprovedAt) || !/^EVID-[A-Z0-9-]{1,40}$/.test(String(value.evidenceCode)) || !Number.isSafeInteger(value.capacity) || Number(value.capacity) < 10 || Number(value.capacity) > 25) return null;
  const reviews = (Array.isArray(value.reviews) ? value.reviews : []).slice(0, 40).flatMap(entry => { const review = object(entry); return Number.isSafeInteger(review.week) && Number(review.week) >= 1 && Number(review.week) <= 4 && ["continue", "pause", "expand", "stop"].includes(String(review.decision)) && Number.isSafeInteger(review.capacity) && Number(review.capacity) >= 10 && Number(review.capacity) <= 25 && /^EVID-[A-Z0-9-]{1,40}$/.test(String(review.evidenceCode)) && timestamp(review.recordedAt) ? [{ week: Number(review.week), decision: review.decision as TrialReview["decision"], capacity: Number(review.capacity), safetyReviewed: review.safetyReviewed === true, coverageReviewed: review.coverageReviewed === true, evidenceCode: String(review.evidenceCode), recordedAt: timestamp(review.recordedAt) }] : []; });
  return { revision: Number(value.revision), startedAt: timestamp(value.startedAt), plannedThrough: timestamp(value.plannedThrough), releaseApprovedAt: timestamp(value.releaseApprovedAt), evidenceCode: String(value.evidenceCode), capacity: Number(value.capacity), reviews };
}
export function measurementRecord(input: unknown): MeasurementRecord | null {
  const value = object(input);
  if (typeof value.participantCode !== "string" || !/^P\d{2,4}$/.test(value.participantCode)) return null;
  const source = ["real", "exercise"].includes(String(value.source)) ? value.source as MeasurementSource : "unknown";
  const outcomes = Object.fromEntries(outcomeFields.map(field => [field, typeof value[field] === "boolean" ? value[field] : null])) as Record<typeof outcomeFields[number], boolean | null>;
  return { participantCode: value.participantCode, source: source === "real" && value.consentConfirmed !== true ? "unknown" : source, consentConfirmed: value.consentConfirmed === true, ...outcomes, revision: Number.isSafeInteger(value.revision) && Number(value.revision) >= 0 ? Number(value.revision) : 0, createdAt: timestamp(value.createdAt), updatedAt: timestamp(value.updatedAt) };
}
function summarize(records: MeasurementRecord[], source: MeasurementSource) {
  const selected = [...new Map(records.filter(record => record.source === source).map(record => [record.participantCode, record])).values()];
  const participants = selected.length, unassisted = selected.filter(record => record.submitted === true && record.assisted === false).length;
  const rate = (field: typeof outcomeFields[number]) => participants ? Math.round(selected.filter(record => record[field] === true).length / participants * 100) : null;
  return { participants, submissions: selected.filter(record => record.submitted === true).length, unassistedSubmissionRate: participants ? Math.round(unassisted / participants * 100) : null, statusComprehensionRate: rate("understoodStatus"), duplicateDiscoveryRate: rate("foundDuplicate"), lifecycleCompletionRate: rate("completedLifecycle"), uncollected: Object.fromEntries(outcomeFields.map(field => [field, selected.filter(record => record[field] === null).length])), sampleSufficient: participants >= 10, submissionTargetMet: participants >= 10 && unassisted / participants >= 0.8 };
}
export function createPilotMeasurement(store: PilotMeasurementStore, { now = () => new Date() } = {}) {
  async function read(actor: Operator) {
    requireAdministrator(actor);
    const unique = new Map<string, MeasurementRecord>();
    for (const value of await store.list()) {
      const record = measurementRecord(value); if (!record) continue;
      const key = `${record.source}-${record.participantCode}`, prior = unique.get(key);
      if (!prior || record.revision > prior.revision || (record.revision === prior.revision && record.updatedAt > prior.updatedAt)) unique.set(key, record);
    }
    const records = [...unique.values()];
    return { records, trial: safeTrial(await store.trial()), summary: { real: summarize(records, "real"), exercise: summarize(records, "exercise"), unknown: summarize(records, "unknown") } };
  }
  return {
    read,
    async eraseFinding(actor: Operator, input: unknown) {
      requireAdministrator(actor);
      const value = object(input);
      if (value.deletionApproved !== true || !/^P\d{2,4}$/.test(String(value.participantCode)) || !["real", "exercise", "unknown"].includes(String(value.source)) || !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 || !/^EVID-[A-Z0-9-]{1,40}$/.test(String(value.evidenceCode))) throw new PilotMeasurementValidationError("An approved privacy request, current revision and pseudonymous evidence reference are required.");
      await store.erase({ participantCode: String(value.participantCode), source: value.source as MeasurementSource, expectedRevision: Number(value.expectedRevision), evidenceCode: String(value.evidenceCode), erasedAt: now().toISOString() }, actor);
    },
    async reviewTrial(actor: Operator, input: unknown) {
      requireAdministrator(actor);
      const value = object(input), trial = safeTrial(await store.trial());
      const week = Number(value.week), capacity = Number(value.capacity), decision = value.decision as TrialReview["decision"];
      if (!trial || !Number.isSafeInteger(value.expectedRevision) || !Number.isSafeInteger(week) || week < 1 || week > 4 || week > Math.floor((now().getTime() - Date.parse(trial.startedAt)) / (7 * 86400000)) + 1 || !["continue", "pause", "expand", "stop"].includes(decision) || !/^EVID-[A-Z0-9-]{1,40}$/.test(String(value.evidenceCode)) || typeof value.coverageReviewed !== "boolean" || typeof value.safetyReviewed !== "boolean" || !Number.isSafeInteger(capacity) || capacity < 10 || capacity > 25 || (decision === "expand" ? capacity <= trial.capacity || value.coverageReviewed !== true || value.safetyReviewed !== true : capacity !== trial.capacity) || (decision === "continue" && (value.coverageReviewed !== true || value.safetyReviewed !== true)) || (trial.reviews?.length ?? 0) >= 40) throw new PilotMeasurementValidationError("Record an elapsed/current trial week, evidence and a valid decision. Continuing or expanding requires reviewed safety and coverage; expansion is capped at 25.");
      const review: TrialReview = { week, capacity, decision, coverageReviewed: value.coverageReviewed, safetyReviewed: value.safetyReviewed, evidenceCode: String(value.evidenceCode), recordedAt: now().toISOString() };
      await store.saveTrial({ ...trial, revision: Number(value.expectedRevision) + 1, capacity, reviews: [...trial.reviews ?? [], review] }, actor, Number(value.expectedRevision));
    },
    async startTrial(actor: Operator, input: unknown) {
      requireAdministrator(actor);
      const value = object(input), started = Date.parse(String(value.startedAt ?? ""));
      if (value.expectedRevision !== 0 || value.releaseApproved !== true || value.prerequisitesReviewed !== true || !/^EVID-[A-Z0-9-]{1,40}$/.test(String(value.evidenceCode)) || !Number.isFinite(started) || started > now().getTime() || await store.trial()) throw new PilotMeasurementValidationError("Explicit approval, reviewed prerequisites, evidence code and a non-future start are required. A trial cannot be restarted.");
      await store.saveTrial({ revision: 1, startedAt: new Date(started).toISOString(), plannedThrough: new Date(started + 28 * 86400000).toISOString(), releaseApprovedAt: now().toISOString(), evidenceCode: String(value.evidenceCode), capacity: 10 }, actor, 0);
    },
    async record(actor: Operator, input: unknown) {
      requireAdministrator(actor);
      const value = object(input);
      if (!["real", "exercise", "unknown"].includes(String(value.source)) || outcomeFields.some(field => value[field] !== null && typeof value[field] !== "boolean") || !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 || (value.source === "real" && value.consentConfirmed !== true)) throw new PilotMeasurementValidationError("Record source, consent for real findings, each outcome (or uncollected), and current revision.");
      const record = measurementRecord(value);
      if (!record) throw new PilotMeasurementValidationError("Use a pseudonymous participant code such as P01.");
      if (record.source === "real" && !(await store.trial())?.startedAt) throw new PilotMeasurementValidationError("Record release approval and trial start before real findings.");
      const snapshot = await read(actor), current = snapshot.records.find(entry => entry.participantCode === record.participantCode && entry.source === record.source);
      if (record.source === "real" && !current && snapshot.summary.real.participants >= (snapshot.trial?.capacity ?? 10)) throw new PilotMeasurementValidationError("Reviewed participant capacity has been reached. Record a reviewed expansion before adding participants.");
      await store.save({ ...record, revision: Number(value.expectedRevision) + 1, createdAt: current?.createdAt || now().toISOString(), updatedAt: now().toISOString() }, actor, Number(value.expectedRevision));
    },
    async summary(actor: Operator) { return (await read(actor)).summary; },
  };
}
export function createMemoryPilotMeasurementStore(initial: unknown[] = []): PilotMeasurementStore {
  let trial: PilotTrial | null = null;
  const erased = new Set<string>();
  const records = new Map(initial.map((value, index) => { const record = measurementRecord(value); return [record ? `${record.source}-${record.participantCode}` : `legacy-${index}`, structuredClone(value)]; }));
  return { async save(record, _actor, expectedRevision) {
    const key = `${record.source}-${record.participantCode}`, current = measurementRecord(records.get(key));
    if (erased.has(key)) throw new PilotMeasurementConflictError("An erased participant code cannot be reused.");
    if ((current?.revision ?? 0) !== expectedRevision) throw new PilotMeasurementConflictError("Reload current findings before retrying.");
    records.set(key, structuredClone(record));
  }, async erase(input) {
    const key = `${input.source}-${input.participantCode}`, current = measurementRecord(records.get(key));
    if (erased.has(key)) return;
    if (!current || current.revision !== input.expectedRevision) throw new PilotMeasurementConflictError("Reload current findings before erasure.");
    erased.add(key); records.delete(key);
  }, async list() { return [...records.values()].map(value => structuredClone(value)); }, async trial() { return structuredClone(trial); }, async saveTrial(next, _actor, expectedRevision) {
    if ((trial?.revision ?? 0) !== expectedRevision) throw new PilotMeasurementConflictError("Reload current trial before retrying.");
    trial = structuredClone(next);
  } };
}
