import type { Operator } from "@/features/reports/moderation-module";
import { createPilotRelease, demoPilotFixture, type PilotSession } from "./pilot-release";

export type PilotMeasurementStore = { save(session: PilotSession): Promise<void>; list(): Promise<PilotSession[]> };
export class PilotMeasurementForbiddenError extends Error { readonly code = "FORBIDDEN"; }
export class PilotMeasurementValidationError extends Error { readonly code = "VALIDATION"; }
function requireAdministrator(actor: Operator) { if (!actor.roles.includes("Administrator")) throw new PilotMeasurementForbiddenError("Administrator capability is required."); }
function validate(session: PilotSession) { if (!/^P\d{2,4}$/.test(session.participantCode)) throw new PilotMeasurementValidationError("Use a pseudonymous participant code such as P01."); for (const value of [session.submitted, session.assisted, session.understoodStatus, session.foundDuplicate, session.completedLifecycle]) if (typeof value !== "boolean") throw new PilotMeasurementValidationError("Every pilot outcome must be recorded."); }
export function createPilotMeasurement(store: PilotMeasurementStore) { return {
  async record(actor: Operator, session: PilotSession) { requireAdministrator(actor); validate(session); await store.save(structuredClone(session)); },
  async summary(actor: Operator) { requireAdministrator(actor); return createPilotRelease({ ...demoPilotFixture, sessions: await store.list() }).measurement; },
}; }
export function createMemoryPilotMeasurementStore(): PilotMeasurementStore { const sessions = new Map<string, PilotSession>(); return { async save(session) { sessions.set(session.participantCode, structuredClone(session)); }, async list() { return [...sessions.values()].map((session) => structuredClone(session)); } }; }