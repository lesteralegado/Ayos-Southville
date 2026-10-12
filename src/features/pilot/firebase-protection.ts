import "server-only";
import { createHash, createHmac } from "node:crypto";
import type { Transaction } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import type { AuditEvent } from "@/features/reports/moderation-module";
import { createMutationProtection, ProtectionError, type SensitiveOperation } from "./security-module";
import { OperatingControlError } from "@/features/admin/pilot-operations";

export function pseudonym(value: string) {
  const secret = process.env.AUDIT_PSEUDONYM_SECRET;
  if (!secret || secret.length < 32) throw new ProtectionError("UNAVAILABLE", 503);
  return `anon:${createHmac("sha256", secret).update(value).digest("hex")}`;
}
export function minimizedAudit(event: AuditEvent) {
  const expiresAt = new Date(Date.parse(event.occurredAt) + 365 * 86_400_000).toISOString();
  return { actorUid: /^anon:[a-f0-9]{64}$/.test(event.actorUid) ? event.actorUid : pseudonym(event.actorUid), occurredAt: event.occurredAt,
    action: /^[a-z][a-z.-]{1,60}$/.test(event.action) ? event.action : "operation.recorded",
    target: /^anon:[a-f0-9]{64}$/.test(event.target) ? event.target : pseudonym(event.target), reason: "Private content omitted.", expiresAt,
    ...(event.action === "pilot.operations-updated" && event.operatingChange ? {
      operatingChange: {
        before: safeOperatingAuditState(event.operatingChange.before),
        after: safeOperatingAuditState(event.operatingChange.after),
        recoveryConfirmed: event.operatingChange.recoveryConfirmed === true,
        primaryChanged: event.operatingChange.primaryChanged === true,
        backupChanged: event.operatingChange.backupChanged === true,
      },
    } : {}),
  };
}
function safeOperatingAuditState(value: unknown) {
  const state = value as Record<string, unknown> | undefined;
  return {
    intakePaused: state?.intakePaused === true,
    invitationsPaused: state?.invitationsPaused === true,
    publicRestricted: state?.publicRestricted === true,
    backupAffirmed: state?.backupAffirmed === true,
  };
}
// Reads precede every transaction's writes. These locks prevent stale requests
// from re-creating data while retention/account deletion is in progress.
export async function assertWritable(transaction: Transaction, uid: string, reporterUids: string[] = [], allowedRoles?: string[]) {
  const db = getFirebaseAdmin().db;
  const ids = [...new Set([uid, ...reporterUids])];
  const docs = await transaction.getAll(db.collection("pilotOperations").doc("current"), ...ids.map(id => db.collection("residentProfiles").doc(id)));
  const end = Date.parse(docs[0].data()?.pilotEndedAt ?? "");
  if (Number.isFinite(end) && end <= Date.now()) throw new ProtectionError("FORBIDDEN", 403);
  if (docs.slice(1).some(doc => !doc.exists || doc.data()?.deletionPending === true)) throw new ProtectionError("FORBIDDEN", 403);
  const roles: unknown = docs[1].data()?.roles;
  if (allowedRoles && (!Array.isArray(roles) || !allowedRoles.some(role => roles.includes(role)))) throw new ProtectionError("FORBIDDEN", 403);
}
export async function assertAdministrator(transaction: Transaction, uid: string) {
  const profile = await transaction.get(getFirebaseAdmin().db.collection("residentProfiles").doc(uid));
  const roles: unknown = profile.data()?.roles;
  if (!profile.exists || profile.data()?.deletionPending || !Array.isArray(roles) || !roles.includes("Administrator")) throw new ProtectionError("FORBIDDEN", 403);
}
export async function assertIntakeOpen(transaction: Transaction) {
  if ((await transaction.get(getFirebaseAdmin().db.collection("pilotOperations").doc("current"))).data()?.intakePaused === true)
    throw new OperatingControlError("INTAKE_PAUSED");
}
export async function assertEvidenceIntake(transaction: Transaction, uid: string, draftKey: string) {
  const db = getFirebaseAdmin().db;
  const match = /^(support|resolution)_(AS-[A-Z0-9]+)$/.exec(draftKey);
  if (!match) return assertIntakeOpen(transaction);
  const ref = db.collection(match[1] === "support" ? "publicReports" : "privateReports").doc(match[2]);
  const [report, profile] = await transaction.getAll(ref, db.collection("residentProfiles").doc(uid));
  const roles = profileRolesForEvidence(profile.data()?.roles);
  if (!report.exists || (match[1] === "support" && report.data()?.approved !== true) ||
    (match[1] === "resolution" && !roles.some(role => ["Coordinator", "Administrator"].includes(role))))
    throw new ProtectionError("FORBIDDEN", 403);
}
function profileRolesForEvidence(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((role): role is string => typeof role === "string") : [];
}
export async function protectMutation(uid: string, operation: SensitiveOperation) {
  const db = getFirebaseAdmin().db;
  await createMutationProtection({ async consume(key, limit, expiresAt) {
    const ref = db.collection("mutationLimits").doc(createHash("sha256").update(key).digest("hex"));
    return db.runTransaction(async transaction => {
      const doc = await transaction.get(ref); const count = Number(doc.data()?.count ?? 0);
      if (!Number.isSafeInteger(count) || count >= limit) return false;
      transaction.set(ref, { count: count + 1, expiresAt }); return true;
    });
  } }).check(uid, operation);
}
