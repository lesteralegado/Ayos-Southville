import { NextResponse } from "next/server";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { getVerifiedResident } from "@/features/auth/session";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
import { EngagementValidationError, type NotificationPreferences } from "@/features/reports/engagement-module";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const resident = await getVerifiedResident();
    if (!resident) return NextResponse.json({ code: "AUTH", error: "Sign in to view your notifications." }, { status: 401, headers });
    const engagement = getEngagementModule();
    const [notifications, preferences] = await Promise.all([engagement.listNotifications(resident.uid), engagement.getPreferences(resident.uid)]);
    return NextResponse.json({ notifications, preferences }, { headers });
  } catch { return NextResponse.json({ code: "UNAVAILABLE", error: "Notifications could not be loaded. Retry." }, { status: 503, headers }); }
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ code: "FORBIDDEN", error: "Invalid request origin." }, { status: 403, headers });
  try {
    const resident = await getVerifiedResident();
    if (!resident) return NextResponse.json({ code: "AUTH", error: "Sign in before updating notifications." }, { status: 401, headers });
    const input = await readBoundedJson(request) as { notificationId?: string; preferences?: NotificationPreferences };
    if (!input || typeof input !== "object" || (!!input.notificationId === !!input.preferences)) throw new EngagementValidationError("Choose one notification action.");
    const engagement = getEngagementModule();
    if (input.notificationId !== undefined) {
      if (typeof input.notificationId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(input.notificationId)) throw new EngagementValidationError("Choose a valid notification.");
      await engagement.markNotificationRead(resident.uid, input.notificationId);
    } else await engagement.setPreferences(resident.uid, input.preferences!);
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
    const invalid = error instanceof EngagementValidationError || error instanceof SyntaxError;
    return NextResponse.json({ code: invalid ? "VALIDATION" : "UNAVAILABLE", error: invalid ? "Choose valid notification settings." : "The update could not be confirmed. Reload and retry." }, { status: invalid ? 422 : 503, headers });
  }
}
