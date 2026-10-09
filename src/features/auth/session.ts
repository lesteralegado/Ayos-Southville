import { cookies } from "next/headers";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export const sessionCookieName = "ayos_session";
export const sessionDurationMs = 5 * 24 * 60 * 60 * 1000;

export async function getVerifiedResident() {
  const sessionCookie = (await cookies()).get(sessionCookieName)?.value;
  if (!sessionCookie) return null;
  try {
    const claims = await getFirebaseAdmin().auth.verifySessionCookie(sessionCookie, true);
    return claims.email_verified ? claims : null;
  } catch {
    return null;
  }
}
