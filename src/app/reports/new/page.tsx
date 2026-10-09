import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { ReportComposer } from "@/features/reports/report-composer";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const resident = await getVerifiedResident();
  if (!resident) redirect("/sign-in?next=/reports/new");
  return <ReportComposer emergencyGuidance={{
    phone: process.env.EMERGENCY_HOTLINE_PHONE ?? "911",
    sourceUrl: process.env.EMERGENCY_HOTLINE_SOURCE ?? "https://ehotlines.e.gov.ph/",
  }} />;
}
