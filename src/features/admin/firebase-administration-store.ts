import "server-only";
import { assertAdministrator, assertParticipant, assertWritable, minimizedAudit, protectMutation } from "@/features/pilot/firebase-protection";
import { consentReceipt } from "@/features/pilot/participation-consent";
import { pilotRecordsExpired } from "@/features/pilot/pilot-expiry";
import { createHash } from "node:crypto";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  AdministrationValidationError,
  createAdministrationModule,
  defaultPilotConfiguration,
  profileRoles,
  type AdministrationStore,
  type PilotConfiguration,
  type PilotUser,
  type PilotInvitation,
} from "./administration-module";
import type { AuditEvent } from "@/features/reports/moderation-module";
import { coverageToValidate, eligibleOperator, pilotOperations, OperatingControlError } from "./pilot-operations";

const invitationId = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const profileUser = (doc: DocumentSnapshot): PilotUser => {
  const data = doc.data() ?? {};
  return {
    uid: doc.id,
    roles: profileRoles(data.roles),
    ...(typeof data.publicAlias === "string"
      ? { publicAlias: data.publicAlias }
      : {}),
    ...(data.pilotAccess === "approved" || data.pilotAccess === "revoked"
      ? { access: data.pilotAccess }
      : {}),
  };
};

function createFirebaseAdministrationStore(): AdministrationStore {
  const { db, auth } = getFirebaseAdmin();
  return {
    async getConsent(uid) {
      if (await pilotRecordsExpired()) return null;
      return consentReceipt((await db.collection("pilotConsents").doc(uid).get()).data());
    },
    async acceptConsent(resident, receipt) {
      await protectMutation(resident.uid, "consent");
      return db.runTransaction(async transaction => {
        await assertWritable(transaction, resident.uid);
        await assertParticipant(transaction, resident.uid, false);
        const ref = db.collection("pilotConsents").doc(resident.uid);
        const previous = consentReceipt((await transaction.get(ref)).data());
        if (previous) return previous;
        transaction.set(ref, { ...receipt, residentUid: resident.uid });
        return receipt;
      });
    },
    async getOperations() {
      return pilotOperations((await db.collection("pilotOperations").doc("current").get()).data());
    },
    async saveOperations(value, revision, event) {
      await protectMutation(event.actorUid, "operator");
      await db.runTransaction(async transaction => {
        await assertAdministrator(transaction, event.actorUid);
        const ref = db.collection("pilotOperations").doc("current");
        const current = await transaction.get(ref);
        if (pilotOperations(current.data()).revision !== revision) throw new OperatingControlError("CONFLICT");
        const previous = pilotOperations(current.data());
        const coverage = coverageToValidate(previous, value);
        for (const uid of coverage) {
          const profile = await transaction.get(db.collection("residentProfiles").doc(uid));
          const user = await auth.getUser(uid);
          if (!profile.exists || profile.data()?.deletionPending || user.disabled ||
            !eligibleOperator({ roles: profileRoles(profile.data()?.roles), access: profile.data()?.pilotAccess, emailVerified: user.emailVerified }))
            throw new AdministrationValidationError("Coverage requires a current verified operator.");
        }
        transaction.set(ref, value, { merge: true });
        transaction.create(db.collection("auditEvents").doc(), minimizedAudit(event));
      });
    },
    async getUser(uid) {
      const doc = await db.collection("residentProfiles").doc(uid).get();
      return doc.exists ? profileUser(doc) : null;
    },
    async listUsers() {
      const snapshot = await db.collection("residentProfiles").get();
      const users = snapshot.docs.map(profileUser);
      // Auth is authoritative for email/verification; profiles cannot claim verification.
      const records: UserRecord[] = [];
      for (let offset = 0; offset < users.length; offset += 100)
        records.push(
          ...(
            await auth.getUsers(
              users
                .slice(offset, offset + 100)
                .map((user) => ({ uid: user.uid })),
            )
          ).users,
        );
      return users.map((user) => {
        const record = records.find((record) => record.uid === user.uid);
        return {
          ...user,
          email: record?.email ?? "",
          emailVerified: !!record?.emailVerified && !record.disabled,
        };
      });
    },
    async listInvitations() {
      const snapshot = await db.collection("pilotInvitations").get();
      return snapshot.docs.map((doc) => doc.data() as PilotInvitation);
    },
    async getInvitation(email) {
      const doc = await db
        .collection("pilotInvitations")
        .doc(invitationId(email))
        .get();
      return doc.exists ? (doc.data() as PilotInvitation) : null;
    },
    async saveInvitation(invitation, event) {
      await protectMutation(event.actorUid, "operator");
      await db.runTransaction(async transaction => {
        await assertAdministrator(transaction, event.actorUid);
        if (invitation.active && (await transaction.get(db.collection("pilotOperations").doc("current"))).data()?.invitationsPaused)
          throw new OperatingControlError("INVITATIONS_PAUSED");
        transaction.set(db.collection("pilotInvitations").doc(invitationId(invitation.email)), invitation);
        transaction.create(db.collection("auditEvents").doc(), minimizedAudit(event));
      });
    },
    async saveUser(user, event, change) {
      await protectMutation(event.actorUid, "operator");
      await db.runTransaction(async (transaction) => {
        await assertAdministrator(transaction, event.actorUid);
        const targetRef = db.collection("residentProfiles").doc(user.uid);
        const target = await transaction.get(targetRef);
        if (!target.exists)
          throw new AdministrationValidationError("User was not found.");
        if (change === "access" && user.access === "approved" && target.data()?.pilotAccess !== "approved" &&
          (await transaction.get(db.collection("pilotOperations").doc("current"))).data()?.invitationsPaused === true)
          throw new OperatingControlError("INVITATIONS_PAUSED");
        if (target.data()?.deletionPending === true)
          throw new AdministrationValidationError("Account deletion is already approved. Complete the deletion workflow before changing access.");
        if (
          change === "roles" &&
          profileUser(target).roles.includes("Administrator") &&
          !user.roles.includes("Administrator")
        ) {
          const administrators = await transaction.get(
            db
              .collection("residentProfiles")
              .where("roles", "array-contains", "Administrator"),
          );
          const others = administrators.docs.filter(
            (doc) => doc.id !== user.uid,
          );
          const records = others.length
            ? await auth.getUsers(
                others.slice(0, 100).map((doc) => ({ uid: doc.id })),
              )
            : { users: [] };
          if (
            !records.users.some(
              (record) => record.emailVerified && !record.disabled,
            )
          )
            throw new AdministrationValidationError(
              "The pilot must retain at least one verified administrator.",
            );
        }
        // Only mutate the requested field: stale access edits cannot restore old roles.
        transaction.update(
          targetRef,
          change === "access"
            ? { pilotAccess: user.access, updatedAt: event.occurredAt }
            : { roles: user.roles, updatedAt: event.occurredAt },
        );
        transaction.create(db.collection("auditEvents").doc(), minimizedAudit(event));
      });
    },
    async getConfiguration() {
      const doc = await db
        .collection("pilotConfiguration")
        .doc("current")
        .get();
      return (doc.data() ??
        structuredClone(defaultPilotConfiguration)) as PilotConfiguration;
    },
    async saveConfiguration(configuration, event) {
      await protectMutation(event.actorUid, "operator");
      await db.runTransaction(async transaction => {
        await assertAdministrator(transaction, event.actorUid);
        transaction.set(db.collection("pilotConfiguration").doc("current"), configuration);
        transaction.create(db.collection("auditEvents").doc(), minimizedAudit(event));
      });
    },
    async listAudit() {
      const snapshot = await db
        .collection("auditEvents")
        .orderBy("occurredAt", "desc")
        .limit(100)
        .get();
      return snapshot.docs.map((doc) => minimizedAudit(doc.data() as AuditEvent)).filter(event => Date.parse(event.expiresAt) > Date.now());
    },
  };
}
export function getAdministrationModule() {
  return createAdministrationModule({
    store: createFirebaseAdministrationStore(),
  });
}
export async function getPublicPilotConfiguration() {
  return createFirebaseAdministrationStore().getConfiguration();
}
export async function getPublicOperatingStatus() {
  const { intakePaused, invitationsPaused, publicRestricted, explanation, resumesAt } = await createFirebaseAdministrationStore().getOperations();
  return { intakePaused, invitationsPaused, publicRestricted, explanation, resumesAt };
}
