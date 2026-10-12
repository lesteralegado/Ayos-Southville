import { redirect } from "next/navigation";
import { getVerifiedOperator, hasPilotEligibility } from "@/features/auth/session";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";
import { ModerationForbiddenError } from "@/features/reports/moderation-module";
import { OperatorWorkspace } from "@/features/reports/operator-workspace";
export default async function ModerationPage() {
  const actor = await getVerifiedOperator();
  if (!actor) redirect("/sign-in?next=/moderation");
  if (!(await hasPilotEligibility({ uid: actor.uid, email_verified: true })))
    redirect("/account");
  let reports;
  let configuration;
  try {
    reports = await getModerationModule().listWorkspace(actor);
    configuration = await getPublicPilotConfiguration();
  } catch (error) {
    if (error instanceof ModerationForbiddenError) redirect("/account");
    throw error;
  }
  return (
    <OperatorWorkspace
      initialReports={reports}
      actor={actor}
      destinations={configuration.destinations.filter((item) => item.active)}
    />
  );
}
