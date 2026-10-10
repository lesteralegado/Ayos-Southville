import { NextResponse } from "next/server";
import { getVerifiedResident } from "@/features/auth/session";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
import type { NotificationPreferences } from "@/features/reports/engagement-module";

export async function GET() {
  const resident = await getVerifiedResident();
  if (!resident) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const engagement = getEngagementModule();
  const [notifications, preferences] = await Promise.all([engagement.listNotifications(resident.uid), engagement.getPreferences(resident.uid)]);
  return NextResponse.json({ notifications, preferences });
}

export async function PATCH(request: Request) {
  const resident = await getVerifiedResident();
  if (!resident) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const input = await request.json() as { notificationId?: string; preferences?: NotificationPreferences };
  const engagement = getEngagementModule();
  if (typeof input.notificationId === "string") await engagement.markNotificationRead(resident.uid, input.notificationId);
  if (input.preferences) await engagement.setPreferences(resident.uid, input.preferences);
  return NextResponse.json({ ok: true });
}
