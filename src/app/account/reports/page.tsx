import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ResidentReportList } from "@/features/reports/resident-report-list";
import { isReportIndexPending, ReportIndexPending } from "@/features/reports/report-query-error";

export const dynamic = "force-dynamic";

export default async function MyReportsPage() {
  const resident = await getVerifiedResident();
  if (!resident) redirect("/sign-in?next=/account/reports");
  let page;
  try { page = await (await getReportModule()).listMinePage(resident.uid); }
  catch (error) {
    if (isReportIndexPending(error)) return <ReportIndexPending href="/account/reports" />;
    throw error;
  }
  return <ResidentReportList reports={page.reports} nextCursor={page.nextCursor} />;
}
