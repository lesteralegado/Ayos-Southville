import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { NotificationCenter } from "@/features/reports/notification-center";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!await getVerifiedResident()) redirect("/sign-in?next=/account/notifications");
  return <NotificationCenter />;
}
