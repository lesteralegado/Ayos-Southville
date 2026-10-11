import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { PrivacyWorkspace } from "@/features/pilot/privacy-workspace";
export const dynamic = "force-dynamic";
export default async function PrivateDataPage() {
  if (!await getVerifiedResident()) redirect("/sign-in?next=/account/privacy");
  return <PrivacyWorkspace mode="resident" />;
}
