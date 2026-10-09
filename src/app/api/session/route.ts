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

  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken !== "string") {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }
    const { auth: adminAuth, db } = getFirebaseAdmin();
    const claims = await adminAuth.verifyIdToken(body.idToken, true);
    const signedInRecently = Date.now() / 1000 - claims.auth_time < 5 * 60;
    if (!claims.email_verified || !signedInRecently) {
      return NextResponse.json({ error: "Verified recent sign-in required." }, { status: 401 });
    }
    const profile = await db.collection("residentProfiles").doc(claims.uid).get();
    const publicAlias = profile.data()?.publicAlias;
    if (!profile.exists || typeof publicAlias !== "string") {
      return NextResponse.json({ error: "Resident profile required." }, { status: 403 });
    }
    await db.collection("publicAliases").doc(claims.uid).set({ publicAlias });
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, { expiresIn: sessionDurationMs });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionDurationMs / 1000,
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid authentication token." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
