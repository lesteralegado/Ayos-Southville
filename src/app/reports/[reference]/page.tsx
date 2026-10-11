import { notFound, redirect } from "next/navigation";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ReportDetail } from "@/features/reports/report-detail";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const report = await (await getReportModule()).getPublic(reference.toUpperCase());
  if (!report) {
    const resident = await getVerifiedResident();
    const owned = resident ? (await (await getReportModule()).listMine(resident.uid)).find((item) => item.reference === reference.toUpperCase()) : undefined;
    if (!owned) notFound();
    if (owned.status === "Duplicate" && owned.canonicalReference) redirect("/reports/" + owned.canonicalReference);
    return <ReportDetail privateReceipt report={{ reference: owned.reference, category: owned.category, status: owned.status, publicSummary: "Private report / Pribadong ulat", publicArea: "Not publicly visible / Hindi nakikita ng publiko", submittedAt: owned.submittedAt, media: [], timeline: [{ status: "Submitted", occurredAt: owned.submittedAt }] }} />;
  }
  const resident = report.status === "Resolved" ? await getVerifiedResident() : null;
  const canRespond = !!resident && await hasPilotAccess(resident) && (await (await getReportModule()).listMine(resident.uid)).some(owned => owned.reference === report.reference);
  return <ReportDetail report={report} canRespond={canRespond} />;
}
