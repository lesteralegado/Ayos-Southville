import { notFound } from "next/navigation";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ReportDetail } from "@/features/reports/report-detail";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const report = await getReportModule().getPublic(reference.toUpperCase());
  if (!report) notFound();
  return <ReportDetail report={report} />;
}
