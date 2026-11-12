import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!await getVerifiedResident()) redirect("/sign-in?next=/account/notifications");
  redirect("/account/reports#notifications");
}
