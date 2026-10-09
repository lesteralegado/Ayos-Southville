import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { sessionCookieName, sessionDurationMs } from "@/features/auth/session";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  const { idToken } = (await request.json()) as { idToken?: unknown };
  if (typeof idToken !== "string") return NextResponse.json({ error: "Missing token." }, { status: 400 });

  try {
    const adminAuth = getFirebaseAdmin().auth;
    const claims = await adminAuth.verifyIdToken(idToken, true);
    const signedInRecently = Date.now() / 1000 - claims.auth_time < 5 * 60;
    if (!claims.email_verified || !signedInRecently) {
      return NextResponse.json({ error: "Verified recent sign-in required." }, { status: 401 });
    }
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: sessionDurationMs });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionDurationMs / 1000,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid authentication token." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
