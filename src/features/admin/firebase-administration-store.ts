import "server-only";
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
      const batch = db.batch();
      batch.set(
        db.collection("pilotInvitations").doc(invitationId(invitation.email)),
        invitation,
      );
      batch.create(db.collection("auditEvents").doc(), event);
      await batch.commit();
    },
    async saveUser(user, event, change) {
      await db.runTransaction(async (transaction) => {
        const targetRef = db.collection("residentProfiles").doc(user.uid);
        const target = await transaction.get(targetRef);
        if (!target.exists)
          throw new AdministrationValidationError("User was not found.");
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
        transaction.create(db.collection("auditEvents").doc(), event);
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
      const batch = db.batch();
      batch.set(
        db.collection("pilotConfiguration").doc("current"),
        configuration,
      );
      batch.create(db.collection("auditEvents").doc(), event);
      await batch.commit();
    },
    async listAudit() {
      const snapshot = await db
        .collection("auditEvents")
        .orderBy("occurredAt", "desc")
        .limit(100)
        .get();
      return snapshot.docs.map((doc) => doc.data() as AuditEvent);
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
