export type PilotOperations = {
  revision: number;
  primaryUid: string;
  backupUid: string;
  backupAffirmed: boolean;
  intakePaused: boolean;
  invitationsPaused: boolean;
  publicRestricted: boolean;
  explanation: { en: string; fil: string };
  resumesAt: string;
};
export const defaultPilotOperations: PilotOperations = {
  revision: 0, primaryUid: "", backupUid: "", backupAffirmed: false,
  intakePaused: false, invitationsPaused: false, publicRestricted: false,
  explanation: { en: "", fil: "" }, resumesAt: "",
};
export function pilotOperations(value: Partial<PilotOperations> | undefined): PilotOperations {
  return { ...defaultPilotOperations, ...value, explanation: { ...defaultPilotOperations.explanation, ...value?.explanation } };
}
export function isResuming(previous: PilotOperations, next: PilotOperations) {
  return (previous.intakePaused && !next.intakePaused) || (previous.invitationsPaused && !next.invitationsPaused) || (previous.publicRestricted && !next.publicRestricted);
}
export function coverageToValidate(previous: PilotOperations, next: PilotOperations) {
  return (["primaryUid", "backupUid"] as const).map(field =>
    next.intakePaused && !isResuming(previous, next) && next[field] === previous[field] ? "" : next[field],
  ).filter(Boolean);
}
export function eligibleOperator(user: { emailVerified?: boolean; access?: string; roles: string[] }) {
  return !!user.emailVerified && user.access !== "revoked" && user.roles.some(role => ["Administrator", "Moderator", "Coordinator"].includes(role));
}
export class OperatingControlError extends Error {
  constructor(readonly code: "CONFLICT" | "INTAKE_PAUSED" | "INVITATIONS_PAUSED" | "PUBLIC_RESTRICTED", readonly status = 409) {
    super(code === "CONFLICT" ? "Settings changed. Refresh before retrying. / Nagbago ang mga setting. I-refresh bago subukang muli."
      : code === "INTAKE_PAUSED" ? "New reports are paused. Your draft remains; retry after intake resumes. / Pansamantalang sarado ang bagong ulat. Nananatili ang draft; subukan kapag bukas na."
      : code === "INVITATIONS_PAUSED" ? "Invitations are paused. Existing access is unchanged. / Pansamantalang sarado ang imbitasyon. Hindi nagbago ang kasalukuyang access."
      : "Public reports are temporarily restricted for safety. / Pansamantalang nilimitahan ang pampublikong ulat para sa kaligtasan.");
  }
}
export function operatingControlResponse(error: unknown) {
  return error instanceof OperatingControlError
    ? Response.json({ code: error.code, error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } })
    : null;
}
