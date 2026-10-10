import type { Operator, OperatorRole, AuditEvent } from "@/features/reports/moderation-module";

export type PilotUser = { uid: string; roles: OperatorRole[] };
export type CategoryConfig = { id: string; label: { en: string; fil: string }; destinationId: string; active: boolean };
export type DestinationConfig = { id: string; name: string; active: boolean };
export type EmergencyGuidance = { en: { message: string; phone: string; sourceUrl: string }; fil: { message: string; phone: string; sourceUrl: string } };
export type PilotConfiguration = { categories: CategoryConfig[]; destinations: DestinationConfig[]; emergency: EmergencyGuidance };
export type AdministrationStore = { listUsers(): Promise<PilotUser[]>; saveUser(user: PilotUser, audit: AuditEvent): Promise<void>; getConfiguration(): Promise<PilotConfiguration>; saveConfiguration(config: PilotConfiguration, audit: AuditEvent): Promise<void>; listAudit(): Promise<AuditEvent[]> };
export class AdministrationForbiddenError extends Error { readonly code = "FORBIDDEN"; }
export class AdministrationValidationError extends Error { readonly code = "VALIDATION"; }
const allowedRoles: OperatorRole[] = ["Resident", "Moderator", "Coordinator", "Administrator"];
export const defaultPilotConfiguration: PilotConfiguration = {
  destinations: [
    { id: "public-works", name: "Roads and drainage desk", active: true },
    { id: "lighting", name: "Streetlight desk", active: true },
    { id: "waste", name: "Waste collection desk", active: true },
  ],
  categories: [
    { id: "roads-drainage", label: { en: "Roads and drainage", fil: "Kalsada at kanal" }, destinationId: "public-works", active: true },
    { id: "streetlights", label: { en: "Broken streetlight", fil: "Sirang ilaw sa kalsada" }, destinationId: "lighting", active: true },
    { id: "waste-collection", label: { en: "Waste collection", fil: "Koleksyon ng basura" }, destinationId: "waste", active: true },
  ],
  emergency: {
    en: { message: "Call 911 for emergencies.", phone: "911", sourceUrl: "https://e911.gov.ph/" },
    fil: { message: "Tumawag sa 911 para sa emergency.", phone: "911", sourceUrl: "https://e911.gov.ph/" },
  },
};
function requireAdmin(actor: Operator) { if (!actor.roles.includes("Administrator")) throw new AdministrationForbiddenError("Administrator capability is required."); }
function text(value: string, label: string) { if (typeof value !== "string" || !value.trim()) throw new AdministrationValidationError(`${label} is required.`); return value.trim(); }
function validateConfig(config: PilotConfiguration) {
  const destinationIds = new Set(config.destinations.map((destination) => destination.id));
  if (destinationIds.size !== config.destinations.length) throw new AdministrationValidationError("Destination identifiers must be unique.");
  for (const destination of config.destinations) { text(destination.id, "Destination id"); text(destination.name, "Destination name"); }
  const categoryIds = new Set(config.categories.map((category) => category.id));
  if (categoryIds.size !== config.categories.length) throw new AdministrationValidationError("Category identifiers must be unique.");
  for (const category of config.categories) { text(category.id, "Category id"); text(category.label.en, "English category label"); text(category.label.fil, "Filipino category label"); if (!destinationIds.has(category.destinationId)) throw new AdministrationValidationError("Each category needs a configured destination."); }
  for (const guidance of [config.emergency.en, config.emergency.fil]) { text(guidance.message, "Emergency message"); text(guidance.phone, "Emergency phone"); try { const url = new URL(guidance.sourceUrl); if (url.protocol !== "https:") throw new Error(); } catch { throw new AdministrationValidationError("Emergency guidance requires a verified HTTPS source."); } }
}
export function createAdministrationModule({ store, now = () => new Date() }: { store: AdministrationStore; now?: () => Date }) {
  function audit(actor: Operator, action: string, target: string, reason: string): AuditEvent { return { actorUid: actor.uid, occurredAt: now().toISOString(), action, target, reason }; }
  return {
    async listUsers(actor: Operator) { requireAdmin(actor); return store.listUsers(); },
    async setRoles(actor: Operator, input: { uid: string; roles: OperatorRole[]; reason: string }) { requireAdmin(actor); const users = await store.listUsers(); const target = users.find((user) => user.uid === input.uid); if (!target) throw new AdministrationValidationError("User was not found."); const roles = [...new Set(input.roles)]; if (!roles.length || roles.some((role) => !allowedRoles.includes(role))) throw new AdministrationValidationError("Choose valid capabilities."); const remainingAdmins = users.filter((user) => user.uid !== input.uid && user.roles.includes("Administrator")).length; if (target.roles.includes("Administrator") && !roles.includes("Administrator") && remainingAdmins === 0) throw new AdministrationValidationError("The pilot must retain at least one administrator."); const reason = text(input.reason, "Reason"); await store.saveUser({ ...target, roles }, audit(actor, "pilot.roles-updated", input.uid, reason)); },
    async getConfiguration(actor: Operator) { requireAdmin(actor); return store.getConfiguration(); },
    async updateConfiguration(actor: Operator, input: { configuration: PilotConfiguration; reason: string }) { requireAdmin(actor); validateConfig(input.configuration); const reason = text(input.reason, "Reason"); await store.saveConfiguration(structuredClone(input.configuration), audit(actor, "pilot.configuration-updated", "pilot", reason)); },
    async listAudit(actor: Operator) { requireAdmin(actor); return store.listAudit(); },
  };
}
export function createMemoryAdministrationStore(seed: { users?: PilotUser[]; configuration?: PilotConfiguration } = {}): AdministrationStore {
  const users = new Map((seed.users ?? []).map((user) => [user.uid, structuredClone(user)])); let configuration = structuredClone(seed.configuration ?? defaultPilotConfiguration); const audit: AuditEvent[] = [];
  return { async listUsers() { return [...users.values()].map((user) => structuredClone(user)); }, async saveUser(user, event) { users.set(user.uid, structuredClone(user)); audit.push(structuredClone(event)); }, async getConfiguration() { return structuredClone(configuration); }, async saveConfiguration(value, event) { configuration = structuredClone(value); audit.push(structuredClone(event)); }, async listAudit() { return structuredClone(audit); } };
}