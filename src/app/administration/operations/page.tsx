import { redirect } from "next/navigation";
import { getVerifiedOperator } from "@/features/auth/session";
import { PrivacyWorkspace } from "@/features/pilot/privacy-workspace";
export const dynamic = "force-dynamic";
export default async function PrivacyOperationsPage() {
  const actor = await getVerifiedOperator();
  if (!actor) redirect("/sign-in?next=/administration/operations");
  if (!actor.roles.includes("Administrator")) redirect("/account");
  return <PrivacyWorkspace mode="administrator" />;
}
