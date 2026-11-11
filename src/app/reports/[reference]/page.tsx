import { notFound, redirect } from "next/navigation";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ReportDetail } from "@/features/reports/report-detail";
import { residentReportDetail } from "@/features/reports/resident-report-detail";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { discoveryMode, getDiscoveryCategories, getPublicCanonicalReference } from "@/features/reports/firebase-discovery";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const report = await (await getReportModule()).getPublic(reference.toUpperCase());
  if (!report) {
    const canonical = await getPublicCanonicalReference(reference.toUpperCase());
    if (canonical) redirect("/reports/" + canonical);
    const resident = await getVerifiedResident();
    const owned = resident ? await (await getReportModule()).getMine(resident.uid, reference.toUpperCase()) : null;
    if (!owned) notFound();
    if (owned.status === "Duplicate" && owned.canonicalReference) redirect("/reports/" + owned.canonicalReference);
    return <ReportDetail privateReceipt report={residentReportDetail(owned)} />;
  }
  const demonstration = discoveryMode() === "demo";
  const resident = !demonstration && report.status === "Resolved" ? await getVerifiedResident() : null;
  const canRespond = !!resident && await hasPilotAccess(resident) && !!(await (await getReportModule()).getMine(resident.uid, report.reference));
  const categoryLabel = (await getDiscoveryCategories()).find(category => category.id === report.category)?.label;
  return <ReportDetail report={report} canRespond={canRespond} categoryLabel={categoryLabel} demonstration={demonstration} />;
}
