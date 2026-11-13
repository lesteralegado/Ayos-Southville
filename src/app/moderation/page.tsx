import { redirect } from "next/navigation";
import { getVerifiedOperator, hasPilotEligibility } from "@/features/auth/session";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";
import { ModerationForbiddenError } from "@/features/reports/moderation-module";
import { OperatorWorkspace } from "@/features/reports/operator-workspace";
import { isReportIndexPending, ReportIndexPending } from "@/features/reports/report-query-error";
export default async function ModerationPage() {
  const actor = await getVerifiedOperator();
  if (!actor) redirect("/sign-in?next=/moderation");
  if (!(await hasPilotEligibility({ uid: actor.uid, email_verified: true })))
    redirect("/account");
  let reports;
  let configuration;
  try {
    reports = await getModerationModule().listWorkspacePage(actor, { filter: "new", ownedFirst: true });
    configuration = await getPublicPilotConfiguration();
  } catch (error) {
    if (error instanceof ModerationForbiddenError) redirect("/account");
    if (isReportIndexPending(error)) return <ReportIndexPending href="/moderation" />;
    throw error;
  }
  return (
    <OperatorWorkspace
      initialReports={reports.reports}
      initialFilter="new"
      initialNextCursor={reports.nextCursor}
      initialSelectedReport={reports.reports[0] ? await getModerationModule().getPrivateReport(actor, reports.reports[0].reference) : null}
      actor={actor}
      destinations={configuration.destinations.filter((item) => item.active)}
    />
  );
}
