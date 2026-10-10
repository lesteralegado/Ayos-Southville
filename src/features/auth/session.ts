import { cookies } from "next/headers";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import type { OperatorRole } from "@/features/reports/moderation-module";

export const sessionCookieName = "ayos_session";
export const sessionDurationMs = 5 * 24 * 60 * 60 * 1000;

export async function getVerifiedResident() {
  const sessionCookie = (await cookies()).get(sessionCookieName)?.value;
  if (!sessionCookie) return null;
  try {
    const { auth, db } = getFirebaseAdmin();
    const claims = await auth.verifySessionCookie(sessionCookie, true);
    if (!claims.email_verified) return null;
    const profile = await db.collection("residentProfiles").doc(claims.uid).get();
    return profile.exists ? claims : null;
  } catch {
    return null;
  }
}

export async function getVerifiedOperator() {
  const resident = await getVerifiedResident();
  if (!resident) return null;
  const profile = await getFirebaseAdmin().db.collection("residentProfiles").doc(resident.uid).get();
  const roles: unknown = profile.data()?.roles;
  return { uid: resident.uid, roles: Array.isArray(roles) ? roles.filter((role): role is OperatorRole => typeof role === "string" && ["Resident", "Moderator", "Coordinator", "Administrator"].includes(role)) : ["Resident"] satisfies OperatorRole[] };
}