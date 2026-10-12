export const consentVersion = "southville-adult-pilot-2026-10-12";
export function enrollmentApproved(profile: { access?: unknown; roles?: unknown } | null, invited = false) {
  return !!profile && profile.access !== "revoked" && (profile.access === "approved" || invited ||
    (Array.isArray(profile.roles) && profile.roles.some(role => ["Administrator", "Moderator", "Coordinator"].includes(role))));
}
export type ConsentReceipt = { id: string; version: string; consentedAt: string; adultAcknowledged: true; locale: "en" | "fil" };
export type ConsentInput = { version: unknown; adultAcknowledged: unknown; consent: unknown; locale: unknown };
export class ParticipationError extends Error {
  constructor(readonly code: "CONSENT_REQUIRED" | "PILOT_ACCESS_REQUIRED" | "FORBIDDEN" | "VALIDATION" | "VERSION_CHANGED", readonly status = 403) {
    super(code);
  }
}
export function consentReceipt(value: unknown): ConsentReceipt | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !/^[a-f0-9-]{36}$/.test(record.id) || record.version !== consentVersion ||
    typeof record.consentedAt !== "string" || !Number.isFinite(Date.parse(record.consentedAt)) ||
    record.adultAcknowledged !== true || !["en", "fil"].includes(String(record.locale))) return null;
  return { id: record.id, version: consentVersion, consentedAt: record.consentedAt, adultAcknowledged: true, locale: record.locale as "en" | "fil" };
}
