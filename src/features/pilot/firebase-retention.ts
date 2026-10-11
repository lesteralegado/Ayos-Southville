import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getEvidenceBucket } from "@/features/reports/firebase-evidence-store";
import type { AuditEvent } from "@/features/reports/moderation-module";
import { minimizedAudit, pseudonym } from "./firebase-protection";
import { PrivacyError } from "./privacy-module";
import { retentionExpired, type RetentionRecord } from "./retention-module";
import { operationalMonitor } from "./monitoring";

export const retainedCollections = ["privateReports", "moderationReports", "publicReports", "reportEngagements", "residentNotifications", "notificationPreferences", "submissionReceipts", "evidenceUploads", "evidenceDrafts", "evidenceQuotas", "pilotInvitations", "publicAliases", "pilotMeasurements", "lifecycleEmailJobs", "mutationLimits", "auditEvents", "deletionRequests", "cleanupRuns", "erasureLedger", "deletionLocks", "deletionWork"] as const;
const ownedPath = /^private-evidence\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/;
async function inventory() {
  const db = getFirebaseAdmin().db, docs: DocumentSnapshot[] = [];
  for (const collection of retainedCollections) {
    const snapshot = await db.collection(collection).limit(2001).get();
    if (snapshot.size > 2000) throw new PrivacyError(503, "CAPACITY");
    docs.push(...snapshot.docs);
  }
  if (docs.length > 10000) throw new PrivacyError(503, "CAPACITY");
  return docs;
}
function descriptor(doc: DocumentSnapshot, reports: Map<string, Record<string, unknown>>): RetentionRecord {
  const value = doc.data() ?? {}, collection = doc.ref.parent.id;
  const report = typeof value.attachedTo === "string" ? reports.get(value.attachedTo) : undefined;
  let kind: RetentionRecord["kind"] = "pilot";
  if (["auditEvents", "cleanupRuns", "erasureLedger"].includes(collection) || (collection === "deletionRequests" && value.status === "complete")) kind = "audit";
  if (["mutationLimits", "evidenceQuotas", "publicAliases", "deletionLocks"].includes(collection)) kind = "ephemeral";
  if (collection === "evidenceUploads") kind = "upload";
  return { key: doc.ref.path, kind, createdAt: String(value.createdAt ?? value.occurredAt ?? value.completedAt ?? value.requestedAt ?? value.submittedAt ?? ""),
    ...(typeof value.attachedTo === "string" ? { attachedTo: value.attachedTo } : {}),
    ...(report?.status === "Rejected" && typeof report.rejectedAt === "string" ? { rejectedAt: report.rejectedAt } : {}),
    ...(typeof value.expiresAt === "string" ? { expiresAt: value.expiresAt } : collection === "publicAliases" ? { expiresAt: "1970-01-01T00:00:00Z" } : collection === "evidenceQuotas" ? { expiresAt: new Date((doc.createTime?.toMillis() ?? Date.now()) + 2 * 86400000).toISOString() } : {}) };
}
async function removeUpload(doc: DocumentSnapshot, now: Date, pilotEnd?: string, force = false) {
  const db = getFirebaseAdmin().db;
  const path = await db.runTransaction(async transaction => {
    const current = await transaction.get(doc.ref), value = current.data();
    if (!value) return null;
    const attached = typeof value.attachedTo === "string" ? await transaction.get(db.collection("privateReports").doc(value.attachedTo)) : undefined;
    const reports = new Map(attached?.exists ? [[attached.id, attached.data()!]] : []);
    if (!force && !retentionExpired(descriptor(current, reports), now, pilotEnd)) return null;
    if (value.path && !ownedPath.test(value.path)) throw new PrivacyError(503, "UNSAFE_STORAGE_PATH");
    transaction.update(doc.ref, { deleted: true }); return String(value.path ?? "");
  });
  if (path === null) return false;
  if (path) await getEvidenceBucket().file(path).delete({ ignoreNotFound: true });
  // Tombstones survive storage failure; retry completes both sides.
  await doc.ref.delete(); return true;
}
async function removeExpired(doc: DocumentSnapshot, now: Date, pilotEnd?: string) {
  if (doc.ref.parent.id === "evidenceUploads") return removeUpload(doc, now, pilotEnd);
  return getFirebaseAdmin().db.runTransaction(async transaction => {
    const current = await transaction.get(doc.ref);
    if (!current.exists || !retentionExpired(descriptor(current, new Map()), now, pilotEnd)) return false;
    transaction.delete(doc.ref); return true;
  });
}
async function minimizeExistingAudits(docs: DocumentSnapshot[]) {
  for (const doc of docs.filter(doc => doc.ref.parent.id === "auditEvents")) {
    const value = doc.data()!;
    if (!value.actorUid?.startsWith("anon:") || !value.target?.startsWith("anon:") || value.reason !== "Private content omitted.")
      await doc.ref.set(minimizedAudit(value as AuditEvent));
  }
}
async function authOperation(uid: string, operation: "disable" | "delete") {
  const auth = getFirebaseAdmin().auth;
  try {
    if (operation === "delete") await auth.deleteUser(uid);
    else { await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid); }
  } catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
}

async function eraseAccount(uid: string, docs: DocumentSnapshot[]) {
  const db = getFirebaseAdmin().db, profileRef = db.collection("residentProfiles").doc(uid);
  await db.runTransaction(async transaction => {
    const profile = await transaction.get(profileRef);
    if (profile.data()?.roles?.includes("Administrator")) throw new PrivacyError(409, "ADMIN_CONTINUITY");
    if (profile.exists) transaction.update(profileRef, { deletionPending: true, pilotAccess: "revoked" });
  });
  await authOperation(uid, "disable");
  // Give an already-claimed email send time to finish. New claims are blocked by
  // the profile lock; deletion must not race a provider request in progress.
  if (docs.some(doc => doc.ref.parent.id === "lifecycleEmailJobs" && doc.data()?.residentUid === uid && Date.parse(doc.data()?.leaseUntil ?? "") > Date.now())) throw new PrivacyError(409, "DELIVERY_BUSY");
  const workRef = db.collection("deletionWork").doc(pseudonym(uid).slice(5)), prior = (await workRef.get()).data();
  const reports = new Set<string>([...(prior?.reportReferences ?? []), ...docs.filter(doc => doc.ref.parent.id === "privateReports" && doc.data()?.reporterUid === uid).map(doc => doc.id)]);
  const uploads = docs.filter(doc => doc.ref.parent.id === "evidenceUploads" && (doc.data()?.residentUid === uid || reports.has(doc.data()?.attachedTo)));
  const ids = new Set<string>([...(prior?.assetIds ?? []), ...uploads.map(doc => doc.id)]);
  await workRef.set({ residentUid: uid, reportReferences: [...reports], assetIds: [...ids] });
  let email: string | undefined;
  try { email = (await getFirebaseAdmin().auth.getUser(uid)).email; } catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
  for (const doc of docs) {
    const collection = doc.ref.parent.id, value = doc.data()!;
    if (["auditEvents", "cleanupRuns", "deletionRequests", "evidenceUploads", "erasureLedger", "deletionWork", "deletionLocks"].includes(collection)) continue;
    const own = value.residentUid === uid || value.reporterUid === uid || (["notificationPreferences", "publicAliases"].includes(collection) && doc.id === uid);
    const linked = reports.has(doc.id) && ["privateReports", "moderationReports", "publicReports"].includes(collection) || reports.has(value.reference);
    const invitation = collection === "pilotInvitations" && email && value.email === email.trim().toLowerCase();
    if (own || linked || invitation) { await doc.ref.delete(); continue; }
    // Remove merged followers/media links from otherwise unrelated reports.
    if (collection === "moderationReports" || collection === "publicReports") await db.runTransaction(async transaction => {
      const current = await transaction.get(doc.ref); if (!current.exists) return;
      const data = current.data()!, changes: Record<string, unknown> = {};
      for (const field of ["followers", "affectedResidents"]) if (Array.isArray(data[field])) changes[field] = data[field].filter((id: string) => id !== uid);
      for (const field of ["supportingEvidence", "resolutionEvidence", "evidence", "media"]) if (Array.isArray(data[field])) changes[field] = data[field].filter((asset: { id: string }) => !ids.has(asset.id));
      if (data.public?.media) changes.public = { ...data.public, media: data.public.media.filter((asset: { id: string }) => !ids.has(asset.id)) };
      if (Object.keys(changes).length) transaction.update(doc.ref, { ...changes, revision: (data.revision ?? 0) + 1 });
    });
  }
  // Keep upload metadata until all cross-report links have been scrubbed, so a
  // partial failure can reconstruct the same media-id set on the next run.
  for (const doc of uploads) await removeUpload(doc, new Date(), undefined, true);
  await db.collection("deletionLocks").doc(uid).set({ expiresAt: new Date(Date.now() + 86400000).toISOString() });
  await authOperation(uid, "delete");
  await profileRef.delete();
  // A pseudonymous erasure ledger prevents re-linking from isolated backups.
  await db.runTransaction(async transaction => {
    const ref = db.collection("erasureLedger").doc(pseudonym(uid).slice(5));
    if (!(await transaction.get(ref)).exists) transaction.create(ref, { completedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString() });
  });
  await workRef.delete();
}

async function orphanInventory() {
  const bucket = getEvidenceBucket(), files = [];
  let pageToken: string | undefined, scanned = 0;
  do {
    const [page, next] = await bucket.getFiles({ prefix: "private-evidence/", autoPaginate: false, maxResults: 500, pageToken });
    for (const file of page) {
      if (++scanned > 5000) throw new PrivacyError(503, "CAPACITY");
      if (!ownedPath.test(file.name)) continue;
      const [metadata] = await file.getMetadata();
      if (Number.isFinite(Date.parse(metadata.timeCreated ?? "")) && Date.parse(metadata.timeCreated!) <= Date.now() - 86_400_000)
      {
        const matches = await getFirebaseAdmin().db.collection("evidenceUploads").where("path", "==", file.name).limit(2).get();
        if (matches.size === 0) files.push({ path: file.name, generation: metadata.generation });
      }
    }
    if (files.length > 5000) throw new PrivacyError(503, "CAPACITY");
    pageToken = next?.pageToken;
  } while (pageToken);
  return files;
}
export async function runRetention(apply = false) {
  const { db } = getFirebaseAdmin(), now = new Date(), started = now.getTime();
  const opsRef = db.collection("pilotOperations").doc("current"), runId = randomUUID();
  // Explicit independent target pinning is mandatory for destructive mode.
  if (apply && (process.env.RETENTION_APPLY_ENABLED !== "true" || process.env.RETENTION_TARGET_PROJECT !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.RETENTION_TARGET_BUCKET !== process.env.FIREBASE_STORAGE_BUCKET || !process.env.RETENTION_TARGET_PROJECT || !process.env.RETENTION_TARGET_BUCKET)) throw new PrivacyError(403, "CLEANUP_DISABLED");
  await db.runTransaction(async transaction => {
    const ops = await transaction.get(opsRef);
    if (Date.parse(ops.data()?.leaseUntil ?? "") > now.getTime()) throw new PrivacyError(409, "CLEANUP_BUSY");
    transaction.set(opsRef, { leaseToken: runId, leaseUntil: new Date(now.getTime() + 120000).toISOString() }, { merge: true });
  });
  const result = { mode: apply ? "apply" : "dry-run", eligible: 0, removed: 0, deletedAccounts: 0, orphanFiles: 0, auditMigration: 0, status: "complete", occurredAt: now.toISOString() };
  try {
    const ops = (await opsRef.get()).data() ?? {}, pilotEnd = ops.pilotEndedAt as string | undefined;
    const docs = await inventory(), reports = new Map(docs.filter(doc => doc.ref.parent.id === "privateReports").map(doc => [doc.id, doc.data()!]));
    const expired = docs.filter(doc => retentionExpired(descriptor(doc, reports), now, pilotEnd));
    const requests = docs.filter(doc => doc.ref.parent.id === "deletionRequests" && doc.data()?.status === "approved" && typeof doc.data()?.residentUid === "string");
    const profiles = await db.collection("residentProfiles").limit(501).get();
    if (profiles.size > 500) throw new PrivacyError(503, "CAPACITY");
    const pilotExpired = pilotEnd && now.getTime() >= Date.parse(pilotEnd) + 90 * 86_400_000;
    const accountIds = new Set(requests.map(doc => String(doc.data()!.residentUid)));
    // Restores import the latest erasure ledger before any traffic is enabled.
    // Matching restored identities are erased again, never silently revived.
    const erasedSubjects = new Set(docs.filter(doc => doc.ref.parent.id === "erasureLedger").map(doc => doc.id));
    for (const doc of profiles.docs) if (erasedSubjects.has(pseudonym(doc.id).slice(5))) accountIds.add(doc.id);
    if (pilotExpired) for (const doc of profiles.docs) if (!doc.data()?.roles?.includes("Administrator")) accountIds.add(doc.id);
    const orphans = await orphanInventory();
    result.eligible = expired.length; result.orphanFiles = orphans.length;
    result.deletedAccounts = accountIds.size;
    result.auditMigration = docs.filter(doc => doc.ref.parent.id === "auditEvents" && !doc.data()?.actorUid?.startsWith("anon:")).length;
    const planHash = createHash("sha256").update(JSON.stringify({ pilotEnd, expired: expired.map(doc => [doc.ref.path, doc.updateTime?.toMillis()]), requests: requests.map(doc => [doc.id, doc.updateTime?.toMillis()]), accounts: [...accountIds].map(pseudonym), orphans })).digest("hex");
    if (apply) {
      if (ops.dryRunPlan !== planHash || Date.parse(ops.dryRunAt ?? "") < now.getTime() - 86_400_000) throw new PrivacyError(409, "DRY_RUN_REQUIRED");
      await minimizeExistingAudits(docs);
      result.deletedAccounts = 0;
      for (const uid of accountIds) {
        if (Date.now() - started > 85000) { result.status = "partial"; break; }
        await eraseAccount(uid, docs); result.deletedAccounts++;
        for (const request of requests.filter(doc => doc.data()?.residentUid === uid)) await request.ref.update({ residentUid: FieldValue.delete(), status: "complete", completedAt: new Date().toISOString() });
      }
      for (const doc of expired) {
        if (Date.now() - started > 85000) { result.status = "partial"; break; }
        if (await removeExpired(doc, now, pilotEnd)) result.removed++;
      }
      for (const orphan of orphans) {
        if (Date.now() - started > 85000) { result.status = "partial"; break; }
        const matches = await db.collection("evidenceUploads").where("path", "==", orphan.path).limit(2).get();
        if (matches.size === 0) await getEvidenceBucket().file(orphan.path).delete({ ignoreNotFound: true, ifGenerationMatch: orphan.generation });
      }
    } else await opsRef.set({ dryRunPlan: planHash, dryRunAt: now.toISOString() }, { merge: true });
    await db.collection("cleanupRuns").doc(runId).create({ ...result });
    operationalMonitor.record({ operation: "retention", status: 200, code: "OK", durationMs: Date.now() - started });
    return result;
  } catch (error) {
    operationalMonitor.record({ operation: "retention", status: error instanceof PrivacyError ? error.status : 503, code: error instanceof PrivacyError ? error.code : "UNAVAILABLE", durationMs: Date.now() - started });
    await db.collection("cleanupRuns").doc(runId).set({ ...result, status: "failed", failureCode: error instanceof PrivacyError ? error.code : "UNAVAILABLE" }).catch(() => undefined);
    throw error;
  } finally {
    await db.runTransaction(async transaction => {
      const current = await transaction.get(opsRef);
      if (current.data()?.leaseToken === runId) transaction.update(opsRef, { leaseToken: "", leaseUntil: "" });
    });
  }
}
