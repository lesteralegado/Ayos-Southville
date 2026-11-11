import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ResidentReportList } from "@/features/reports/resident-report-list";

export const dynamic = "force-dynamic";

export default async function MyReportsPage() {
  const resident = await getVerifiedResident();
  if (!resident) redirect("/sign-in?next=/account/reports");
  const page = await (await getReportModule()).listMinePage(resident.uid);
  return <ResidentReportList reports={page.reports} nextCursor={page.nextCursor} />;
}
