import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import type { Operator } from "@/features/reports/moderation-module";
import { createPrivacyModule, PrivacyError, requirePrivacyAdmin, type DeletionRequest } from "./privacy-module";
import { assertAdministrator, minimizedAudit, protectMutation, pseudonym } from "./firebase-protection";

export async function verifyPrivacyAdmin(transaction: Transaction, actor: Operator) {
  requirePrivacyAdmin(actor);
  await assertAdministrator(transaction, actor.uid);
}
export function getPrivacyModule() {
  const db = getFirebaseAdmin().db, requests = db.collection("deletionRequests");
  return createPrivacyModule({ store: {
    async mine(uid) {
      const doc = await requests.doc(pseudonym(uid).slice(5)).get();
      return doc.exists ? doc.data() as DeletionRequest : null;
    },
    async list() {
      const snapshot = await requests.limit(501).get();
      if (snapshot.size > 500) throw new PrivacyError(503, "CAPACITY");
      return snapshot.docs.map(doc => doc.data() as DeletionRequest).toSorted((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    },
    async requestOnce(request) {
      await protectMutation(request.residentUid!, "privacy");
      return db.runTransaction(async transaction => {
        const ref = requests.doc(pseudonym(request.residentUid!).slice(5)), existing = await transaction.get(ref);
        if (existing.exists && existing.data()?.status !== "cancelled") return existing.data() as DeletionRequest;
        const profile = await transaction.get(db.collection("residentProfiles").doc(request.residentUid!));
        if (!profile.exists || profile.data()?.deletionPending) throw new PrivacyError(403, "FORBIDDEN");
        transaction.set(ref, request); return request;
      });
    },
    async decide(id, status, actor) {
      await protectMutation(actor.uid, "privacy");
      await db.runTransaction(async transaction => {
        await verifyPrivacyAdmin(transaction, actor);
        const matches = await transaction.get(requests.where("id", "==", id).limit(2));
        if (matches.size !== 1) throw new PrivacyError(404, "NOT_FOUND");
        const doc = matches.docs[0], request = doc.data() as DeletionRequest;
        if (request.status === status) return;
        if (request.status !== "requested" || !request.residentUid) throw new PrivacyError(409, "CONFLICT");
        const profileRef = db.collection("residentProfiles").doc(request.residentUid);
        const profile = await transaction.get(profileRef);
        if (status === "approved" && profile.data()?.roles?.includes("Administrator")) throw new PrivacyError(409, "ADMIN_CONTINUITY");
        transaction.update(doc.ref, { status });
        if (status === "approved" && profile.exists) transaction.update(profileRef, { deletionPending: true, pilotAccess: "revoked" });
        transaction.create(db.collection("auditEvents").doc(), minimizedAudit({ actorUid: actor.uid, target: id, action: `privacy.${status}`, occurredAt: new Date().toISOString(), reason: "" }));
      });
    },
  } });
}
export async function operationsState() {
  const db = getFirebaseAdmin().db;
  const [current, runs] = await Promise.all([db.collection("pilotOperations").doc("current").get(), db.collection("cleanupRuns").orderBy("occurredAt", "desc").limit(10).get()]);
  return { pilotEndedAt: current.data()?.pilotEndedAt ?? null, cleanupEnabled: process.env.RETENTION_APPLY_ENABLED === "true",
    runs: runs.docs.map(doc => ({ mode: doc.data().mode, occurredAt: doc.data().occurredAt, eligible: doc.data().eligible, removed: doc.data().removed, status: doc.data().status })) };
}
export async function recordPilotEnd(actor: Operator, value: unknown, confirmed: unknown) {
  if (confirmed !== true || typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PrivacyError(422, "VALIDATION");
  const end = new Date(`${value}T00:00:00+08:00`);
  if (!Number.isFinite(end.getTime()) || end.getTime() > Date.now() || end.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) !== value) throw new PrivacyError(422, "VALIDATION");
  await protectMutation(actor.uid, "privacy");
  const db = getFirebaseAdmin().db;
  await db.runTransaction(async transaction => {
    await verifyPrivacyAdmin(transaction, actor);
    const ref = db.collection("pilotOperations").doc("current"), current = await transaction.get(ref);
    if (current.data()?.pilotEndedAt) throw new PrivacyError(409, "END_ALREADY_RECORDED");
    transaction.set(ref, { pilotEndedAt: end.toISOString(), recordsExpireAt: Timestamp.fromMillis(end.getTime() + 90 * 86400000) }, { merge: true });
    transaction.create(db.collection("auditEvents").doc(), minimizedAudit({ actorUid: actor.uid, target: "pilot", action: "pilot.ended", occurredAt: new Date().toISOString(), reason: "" }));
  });
}
