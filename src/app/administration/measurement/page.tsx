import { redirect } from "next/navigation";
import { getVerifiedOperator } from "@/features/auth/session";
import { MeasurementWorkspace } from "@/features/pilot/measurement-workspace";
export const dynamic = "force-dynamic";
export default async function MeasurementPage() {
  const actor = await getVerifiedOperator();
  if (!actor) redirect("/sign-in?next=/administration/measurement");
  if (!actor.roles.includes("Administrator")) redirect("/account");
  return <MeasurementWorkspace />;
}
