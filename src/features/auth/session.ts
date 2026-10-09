import { cookies } from "next/headers";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

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
