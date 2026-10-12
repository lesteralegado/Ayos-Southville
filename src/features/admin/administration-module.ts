import type {
  Operator,
  OperatorRole,
  AuditEvent,
} from "@/features/reports/moderation-module";
import { coverageToValidate, eligibleOperator, isResuming, defaultPilotOperations, OperatingControlError, type PilotOperations } from "./pilot-operations";
import { consentReceipt, consentVersion, ParticipationError, type ConsentInput, type ConsentReceipt } from "@/features/pilot/participation-consent";

export type PilotUser = {
  uid: string;
  roles: OperatorRole[];
  publicAlias?: string;
  email?: string;
  emailVerified?: boolean;
  access?: "approved" | "revoked";
};
export type PilotInvitation = { email: string; active: boolean };
export type PilotResident = {
  uid: string;
  email?: string;
  emailVerified: boolean;
};
export type CategoryConfig = {
  id: string;
  label: { en: string; fil: string };
  destinationId: string;
  active: boolean;
};
export type DestinationConfig = { id: string; name: string; active: boolean };
export type EmergencyGuidance = {
  en: { message: string; phone: string; sourceUrl: string };
  fil: { message: string; phone: string; sourceUrl: string };
};
export type PilotConfiguration = {
  categories: CategoryConfig[];
  destinations: DestinationConfig[];
  emergency: EmergencyGuidance;
};
export type AdministrationStore = {
  getConsent(uid: string): Promise<ConsentReceipt | null>;
  acceptConsent(resident: PilotResident, receipt: ConsentReceipt): Promise<ConsentReceipt>;
  getOperations(): Promise<PilotOperations>;
  saveOperations(value: PilotOperations, expectedRevision: number, audit: AuditEvent): Promise<void>;
  listUsers(): Promise<PilotUser[]>;
  getUser(uid: string): Promise<PilotUser | null>;
  listInvitations(): Promise<PilotInvitation[]>;
  getInvitation(email: string): Promise<PilotInvitation | null>;
  saveInvitation(invitation: PilotInvitation, audit: AuditEvent): Promise<void>;
  saveUser(
    user: PilotUser,
    audit: AuditEvent,
    change: "roles" | "access",
  ): Promise<void>;
  getConfiguration(): Promise<PilotConfiguration>;
  saveConfiguration(
    config: PilotConfiguration,
    audit: AuditEvent,
  ): Promise<void>;
  listAudit(): Promise<AuditEvent[]>;
};
export class AdministrationForbiddenError extends Error {
  readonly code = "FORBIDDEN";
}
export class AdministrationValidationError extends Error {
  readonly code = "VALIDATION";
}
export const allowedRoles: OperatorRole[] = [
  "Resident",
  "Moderator",
  "Coordinator",
  "Administrator",
];
export function profileRoles(value: unknown): OperatorRole[] {
  return Array.isArray(value)
    ? value.filter((role): role is OperatorRole => allowedRoles.includes(role))
    : ["Resident"];
}
export const defaultPilotConfiguration: PilotConfiguration = {
  destinations: [
    { id: "public-works", name: "Roads and drainage desk", active: true },
    { id: "lighting", name: "Streetlight desk", active: true },
    { id: "waste", name: "Waste collection desk", active: true },
  ],
  categories: [
    {
      id: "roads-drainage",
      label: { en: "Roads and drainage", fil: "Kalsada at kanal" },
      destinationId: "public-works",
      active: true,
    },
    {
      id: "streetlights",
      label: { en: "Broken streetlight", fil: "Sirang ilaw sa kalsada" },
      destinationId: "lighting",
      active: true,
    },
    {
      id: "waste-collection",
      label: { en: "Waste collection", fil: "Koleksyon ng basura" },
      destinationId: "waste",
      active: true,
    },
  ],
  emergency: {
    en: {
      message: "Call 911 for emergencies.",
      phone: "911",
      sourceUrl: "https://e911.gov.ph/",
    },
    fil: {
      message: "Tumawag sa 911 para sa emergency.",
      phone: "911",
      sourceUrl: "https://e911.gov.ph/",
    },
  },
};
function requireAdmin(actor: Operator) {
  if (!actor.roles.includes("Administrator"))
    throw new AdministrationForbiddenError(
      "Administrator capability is required.",
    );
}
function operatingAuditState(value: PilotOperations) {
  const { intakePaused, invitationsPaused, publicRestricted, backupAffirmed } = value;
  return { intakePaused, invitationsPaused, publicRestricted, backupAffirmed };
}
function text(value: string, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 1000)
    throw new AdministrationValidationError(
      `${label} is required (up to 1000 characters).`,
    );
  return value.trim();
}
function validateConfig(config: PilotConfiguration) {
  if (
    !config ||
    !Array.isArray(config.categories) ||
    !Array.isArray(config.destinations) ||
    !config.emergency?.en ||
    !config.emergency?.fil
  )
    throw new AdministrationValidationError(
      "Complete categories, destinations, and bilingual emergency guidance.",
    );
  if (
    !config.categories.length ||
    !config.destinations.length ||
    config.categories.length > 30 ||
    config.destinations.length > 30
  )
    throw new AdministrationValidationError(
      "Configure 1 to 30 categories and destinations.",
    );
  if (
    config.destinations.some((entry) => !entry || typeof entry !== "object") ||
    config.categories.some((entry) => !entry || typeof entry !== "object")
  )
    throw new AdministrationValidationError(
      "Complete every category and destination.",
    );
  const destinationIds = new Set(
    config.destinations.map((destination) => destination.id),
  );
  if (destinationIds.size !== config.destinations.length)
    throw new AdministrationValidationError(
      "Destination identifiers must be unique.",
    );
  for (const destination of config.destinations) {
    if (
      !destination ||
      typeof destination.id !== "string" ||
      typeof destination.active !== "boolean" ||
      !/^[a-z0-9-]{1,60}$/.test(destination.id)
    )
      throw new AdministrationValidationError(
        "Destination identifiers use lowercase letters, numbers, and hyphens.",
      );
    text(destination.name, "Destination name");
  }
  const categoryIds = new Set(config.categories.map((category) => category.id));
  if (categoryIds.size !== config.categories.length)
    throw new AdministrationValidationError(
      "Category identifiers must be unique.",
    );
  for (const category of config.categories) {
    if (
      !category ||
      typeof category.id !== "string" ||
      typeof category.destinationId !== "string" ||
      typeof category.active !== "boolean" ||
      !/^[a-z0-9-]{1,60}$/.test(category.id)
    )
      throw new AdministrationValidationError(
        "Category identifiers use lowercase letters, numbers, and hyphens.",
      );
    text(category.label?.en, "English category label");
    text(category.label?.fil, "Filipino category label");
    if (!destinationIds.has(category.destinationId))
      throw new AdministrationValidationError(
        "Each category needs a configured destination.",
      );
    if (
      category.active &&
      !config.destinations.some(
        (destination) =>
          destination.id === category.destinationId && destination.active,
      )
    )
      throw new AdministrationValidationError(
        "Active categories need an active destination.",
      );
  }
  if (!config.categories.some((category) => category.active))
    throw new AdministrationValidationError(
      "Keep at least one active category.",
    );
  for (const guidance of [config.emergency.en, config.emergency.fil]) {
    text(guidance.message, "Emergency message");
    text(guidance.phone, "Emergency phone");
    text(guidance.sourceUrl, "Emergency source");
    try {
      const url = new URL(guidance.sourceUrl);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      throw new AdministrationValidationError(
        "Emergency guidance requires a verified HTTPS source.",
      );
    }
  }
}
export function createAdministrationModule({
  store,
  now = () => new Date(),
}: {
  store: AdministrationStore;
  now?: () => Date;
}) {
  async function canEnroll(resident: PilotResident) {
    if (!resident.emailVerified) return false;
    const user = await store.getUser(resident.uid);
    if (!user || user.access === "revoked") return false;
    if (user.access === "approved" || user.roles.some(role => ["Administrator", "Moderator", "Coordinator"].includes(role))) return true;
    return resident.email ? (await store.getInvitation(resident.email.trim().toLowerCase()))?.active === true : false;
  }
  function audit(
    actor: Operator,
    action: string,
    target: string,
    reason: string,
  ): AuditEvent {
    return {
      actorUid: actor.uid,
      occurredAt: now().toISOString(),
      action,
      target,
      reason,
    };
  }
  return {
    canEnroll,
    async getConsent(resident: PilotResident) {
      if (!resident.emailVerified) throw new ParticipationError("FORBIDDEN");
      return store.getConsent(resident.uid);
    },
    async acceptConsent(resident: PilotResident, input: ConsentInput) {
      if (!input || input.version !== consentVersion) throw new ParticipationError("VERSION_CHANGED", 409);
      if (input.adultAcknowledged !== true || input.consent !== true || !["en", "fil"].includes(String(input.locale)))
        throw new ParticipationError("VALIDATION", 422);
      if (!(await canEnroll(resident))) throw new ParticipationError("PILOT_ACCESS_REQUIRED");
      return store.acceptConsent(resident, { id: crypto.randomUUID(), version: consentVersion, consentedAt: now().toISOString(), adultAcknowledged: true, locale: input.locale as "en" | "fil" });
    },
    async getOperations(actor: Operator) {
      requireAdmin(actor);
      return store.getOperations();
    },
    async updateOperations(actor: Operator, input: { operations: PilotOperations; expectedRevision: number; recoveryConfirmed: boolean }) {
      requireAdmin(actor);
      const value = input?.operations;
      if (!value || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
        ["intakePaused", "invitationsPaused", "publicRestricted", "backupAffirmed"].some(key => typeof value[key as keyof PilotOperations] !== "boolean") ||
        typeof value.primaryUid !== "string" || typeof value.backupUid !== "string" ||
        typeof value.resumesAt !== "string" || typeof value.explanation?.en !== "string" || typeof value.explanation?.fil !== "string")
        throw new AdministrationValidationError("Complete the operating controls.");
      if (value.primaryUid && value.primaryUid === value.backupUid)
        throw new AdministrationValidationError("Choose different primary and backup operators.");
      const previous = await store.getOperations();
      if (previous.revision !== input.expectedRevision) throw new OperatingControlError("CONFLICT");
      const resuming = isResuming(previous, value);
      const coverage = coverageToValidate(previous, value);
      const users = coverage.length ? await store.listUsers() : [];
      for (const uid of coverage)
        if (!users.some(user => user.uid === uid && eligibleOperator(user)))
          throw new AdministrationValidationError("Coverage requires a verified, authorized operator.");
      if (value.backupAffirmed && !value.backupUid)
        throw new AdministrationValidationError("Choose a backup before affirming coverage.");
      if (value.publicRestricted && !value.intakePaused)
        throw new AdministrationValidationError("Suspend intake while public information is restricted for safety.");
      {
        for (const label of [value.explanation.en, value.explanation.fil])
          if (((value.intakePaused || value.invitationsPaused || value.publicRestricted) && !label.trim()) || label.length > 240 || /https?:|@|\d{5}/i.test(label))
            throw new AdministrationValidationError("Add safe English and Filipino explanations (up to 240 characters); omit contacts and private schedules.");
      }
      if (value.resumesAt && (!Number.isFinite(Date.parse(value.resumesAt)) || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(value.resumesAt)))
        throw new AdministrationValidationError("Use a resumption time with an explicit timezone, or leave it unknown.");
      if (resuming && (input.recoveryConfirmed !== true || !value.primaryUid || !value.backupUid || !value.backupAffirmed))
        throw new AdministrationValidationError("Confirm restored coverage or a fixed and retested fault before resuming. Record primary and affirmed backup coverage.");
      await store.saveOperations({
        revision: previous.revision + 1, primaryUid: value.primaryUid, backupUid: value.backupUid,
        backupAffirmed: value.backupAffirmed, intakePaused: value.intakePaused,
        invitationsPaused: value.invitationsPaused, publicRestricted: value.publicRestricted,
        explanation: { en: value.explanation.en.trim(), fil: value.explanation.fil.trim() },
        resumesAt: value.resumesAt,
      }, input.expectedRevision, {
        ...audit(actor, "pilot.operations-updated", "pilot", "Operating controls updated."),
        operatingChange: {
          before: operatingAuditState(previous), after: operatingAuditState(value),
          recoveryConfirmed: input.recoveryConfirmed === true,
          primaryChanged: previous.primaryUid !== value.primaryUid,
          backupChanged: previous.backupUid !== value.backupUid,
        },
      });
    },
    async canParticipate(resident: PilotResident) {
      return await canEnroll(resident) && !!consentReceipt(await store.getConsent(resident.uid));
    },
    async listInvitations(actor: Operator) {
      requireAdmin(actor);
      return store.listInvitations();
    },
    async setInvitation(
      actor: Operator,
      input: { email: string; active: boolean; reason: string },
    ) {
      requireAdmin(actor);
      const email = text(input?.email, "Email").toLowerCase();
      if (input.active && (await store.getOperations()).invitationsPaused)
        throw new OperatingControlError("INVITATIONS_PAUSED");
      if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof input.active !== "boolean"
      )
        throw new AdministrationValidationError(
          "Enter a valid email and invitation state.",
        );
      await store.saveInvitation(
        { email, active: input.active },
        audit(
          actor,
          input.active ? "pilot.invited" : "pilot.invitation-revoked",
          email,
          text(input.reason, "Reason"),
        ),
      );
    },
    async setAccess(
      actor: Operator,
      input: { uid: string; access: "approved" | "revoked"; reason: string },
    ) {
      requireAdmin(actor);
      if (!input || !["approved", "revoked"].includes(input.access))
        throw new AdministrationValidationError(
          "Choose approved or revoked access.",
        );
      const user = await store.getUser(text(input.uid, "User"));
      if (!user) throw new AdministrationValidationError("User was not found.");
      if (input.access === "approved" && user.access !== "approved" && (await store.getOperations()).invitationsPaused)
        throw new OperatingControlError("INVITATIONS_PAUSED");
      await store.saveUser(
        { ...user, access: input.access },
        audit(
          actor,
          "pilot.access-updated",
          user.uid,
          text(input.reason, "Reason"),
        ),
        "access",
      );
    },
    async listUsers(actor: Operator) {
      requireAdmin(actor);
      return store.listUsers();
    },
    async setRoles(
      actor: Operator,
      input: { uid: string; roles: OperatorRole[]; reason: string },
    ) {
      requireAdmin(actor);
      if (!input || !Array.isArray(input.roles))
        throw new AdministrationValidationError("Choose valid capabilities.");
      const users = await store.listUsers();
      const target = users.find((user) => user.uid === input.uid);
      if (!target)
        throw new AdministrationValidationError("User was not found.");
      const roles = [...new Set(input.roles)];
      if (!roles.length || roles.some((role) => !allowedRoles.includes(role)))
        throw new AdministrationValidationError("Choose valid capabilities.");
      const remainingAdmins = users.filter(
        (user) =>
          user.uid !== input.uid &&
          user.roles.includes("Administrator") &&
          user.emailVerified !== false,
      ).length;
      if (
        target.roles.includes("Administrator") &&
        !roles.includes("Administrator") &&
        remainingAdmins === 0
      )
        throw new AdministrationValidationError(
          "The pilot must retain at least one administrator.",
        );
      const reason = text(input.reason, "Reason");
      await store.saveUser(
        { ...target, roles },
        audit(actor, "pilot.roles-updated", input.uid, reason),
        "roles",
      );
    },
    async getConfiguration(actor: Operator) {
      requireAdmin(actor);
      return store.getConfiguration();
    },
    async updateConfiguration(
      actor: Operator,
      input: { configuration: PilotConfiguration; reason: string },
    ) {
      requireAdmin(actor);
      validateConfig(input.configuration);
      const reason = text(input.reason, "Reason");
      await store.saveConfiguration(
        structuredClone(input.configuration),
        audit(actor, "pilot.configuration-updated", "pilot", reason),
      );
    },
    async listAudit(actor: Operator) {
      requireAdmin(actor);
      return store.listAudit();
    },
  };
}
export function createMemoryAdministrationStore(
  seed: {
    users?: PilotUser[];
    invitations?: PilotInvitation[];
    configuration?: PilotConfiguration;
    operations?: PilotOperations;
    consents?: { residentUid: string; receipt: ConsentReceipt }[];
  } = {},
): AdministrationStore {
  const users = new Map(
    (seed.users ?? []).map((user) => [user.uid, structuredClone(user)]),
  );
  let configuration = structuredClone(
    seed.configuration ?? defaultPilotConfiguration,
  );
  const audit: AuditEvent[] = [];
  const consents = new Map((seed.consents ?? []).map(value => [value.residentUid, structuredClone(value.receipt)]));
  let operations = structuredClone(seed.operations ?? defaultPilotOperations);
  const invitations = new Map(
    (seed.invitations ?? []).map((invitation) => [
      invitation.email,
      structuredClone(invitation),
    ]),
  );
  return {
    async getConsent(uid) { return structuredClone(consents.get(uid) ?? null); },
    async acceptConsent(resident, receipt) {
      const user = users.get(resident.uid);
      if (!resident.emailVerified || !user || user.access === "revoked" ||
        !(user.access === "approved" || user.roles.some(role => ["Administrator", "Moderator", "Coordinator"].includes(role)) ||
          (resident.email && invitations.get(resident.email.trim().toLowerCase())?.active))) throw new ParticipationError("PILOT_ACCESS_REQUIRED");
      const existing = consents.get(resident.uid);
      if (existing) return structuredClone(existing);
      consents.set(resident.uid, structuredClone(receipt)); return structuredClone(receipt);
    },
    async getOperations() { return structuredClone(operations); },
    async saveOperations(value, revision, event) {
      if (operations.revision !== revision) throw new OperatingControlError("CONFLICT");
      const actor = users.get(event.actorUid);
      if (!actor?.roles.includes("Administrator")) throw new AdministrationForbiddenError("Administrator capability is required.");
      operations = structuredClone(value);
      audit.push(structuredClone(event));
    },
    async getUser(uid) {
      return structuredClone(users.get(uid) ?? null);
    },
    async listInvitations() {
      return [...invitations.values()].map((value) => structuredClone(value));
    },
    async getInvitation(email) {
      return structuredClone(invitations.get(email) ?? null);
    },
    async saveInvitation(invitation, event) {
      if (invitation.active && operations.invitationsPaused) throw new OperatingControlError("INVITATIONS_PAUSED");
      invitations.set(invitation.email, structuredClone(invitation));
      audit.push(structuredClone(event));
    },
    async listUsers() {
      return [...users.values()].map((user) => structuredClone(user));
    },
    async saveUser(user, event, change) {
      const current = users.get(user.uid);
      if (change === "access" && user.access === "approved" && current?.access !== "approved" && operations.invitationsPaused)
        throw new OperatingControlError("INVITATIONS_PAUSED");
      if (!current)
        throw new AdministrationValidationError("User was not found.");
      users.set(
        user.uid,
        structuredClone({
          ...current,
          ...(change === "roles"
            ? { roles: user.roles }
            : { access: user.access }),
        }),
      );
      audit.push(structuredClone(event));
    },
    async getConfiguration() {
      return structuredClone(configuration);
    },
    async saveConfiguration(value, event) {
      configuration = structuredClone(value);
      audit.push(structuredClone(event));
    },
    async listAudit() {
      return structuredClone(audit);
    },
  };
}
