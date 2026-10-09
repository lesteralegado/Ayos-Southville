import { notFound } from "next/navigation";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ReportDetail } from "@/features/reports/report-detail";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const [{ reference }, query] = await Promise.all([params, searchParams]);
  const report = await getReportModule().getPublic(reference.toUpperCase());
  if (!report) notFound();
  return <ReportDetail report={report} newlySubmitted={query.submitted === "1"} />;
}
