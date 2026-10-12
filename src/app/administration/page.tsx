import { redirect } from "next/navigation";
import { getVerifiedOperator } from "@/features/auth/session";
import { getAdministrationModule } from "@/features/admin/firebase-administration-store";
import { AdministrationWorkspace } from "@/features/admin/administration-workspace";
export const dynamic = "force-dynamic";
export default async function AdministrationPage() {
  const actor = await getVerifiedOperator();
  if (!actor) redirect("/sign-in?next=/administration");
  if (!actor.roles.includes("Administrator")) redirect("/account");
  const administration = getAdministrationModule();
  const [users, configuration, invitations, audit, operations] = await Promise.all([
    administration.listUsers(actor),
    administration.getConfiguration(actor),
    administration.listInvitations(actor),
    administration.listAudit(actor),
    administration.getOperations(actor),
  ]);
  return (
    <AdministrationWorkspace
      initial={{ users, configuration, invitations, audit, operations }}
    />
  );
}
