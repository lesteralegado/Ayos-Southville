import { cookies } from "next/headers";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { profileRoles } from "@/features/admin/administration-module";
import { pilotParticipationClosed } from "@/features/pilot/pilot-expiry";

export const sessionCookieName = "ayos_session";
export const sessionDurationMs = 5 * 24 * 60 * 60 * 1000;

export async function getVerifiedResident() {
  const sessionCookie = (await cookies()).get(sessionCookieName)?.value;
  if (!sessionCookie) return null;
  try {
    const { auth, db } = getFirebaseAdmin();
    const claims = await auth.verifySessionCookie(sessionCookie, true);
    if (!claims.email_verified) return null;
    const profile = await db
      .collection("residentProfiles")
      .doc(claims.uid)
      .get();
    return profile.exists && profile.data()?.deletionPending !== true ? claims : null;
  } catch {
    return null;
  }
}

export async function getVerifiedOperator() {
  const resident = await getVerifiedResident();
  if (!resident) return null;
  try {
  const profile = await getFirebaseAdmin()
    .db.collection("residentProfiles")
    .doc(resident.uid)
    .get();
  const roles: unknown = profile.data()?.roles;
  return { uid: resident.uid, roles: profileRoles(roles), email: resident.email };
  } catch { return null; }
}

export async function hasPilotAccess(resident: {
  uid: string;
  email?: string;
  email_verified?: boolean;
}) {
  if (await pilotParticipationClosed()) return false;
  const { getAdministrationModule } = await import("@/features/admin/firebase-administration-store");
  return getAdministrationModule().canParticipate({
    uid: resident.uid,
    email: resident.email,
    emailVerified: resident.email_verified === true,
  });
}
export async function hasPilotEligibility(resident: { uid: string; email?: string; email_verified?: boolean }) {
  if (await pilotParticipationClosed()) return false;
  const { getAdministrationModule } = await import("@/features/admin/firebase-administration-store");
  return getAdministrationModule().canEnroll({ uid: resident.uid, email: resident.email, emailVerified: resident.email_verified === true });
}
