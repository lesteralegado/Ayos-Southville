import { notFound, redirect } from "next/navigation";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { ReportDetail } from "@/features/reports/report-detail";
import { residentReportDetail } from "@/features/reports/resident-report-detail";
import { ReportUnavailable } from "@/features/reports/report-unavailable";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { discoveryMode, getDiscoveryCategories, getPublicCanonicalReference } from "@/features/reports/firebase-discovery";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams?: Promise<{ from?: string | string[] }> }) {
  const { reference } = await params;
  const fromNotification = (await searchParams)?.from === "notification";
  const notificationResident = fromNotification ? await getVerifiedResident() : null;
  if (fromNotification && !notificationResident) redirect("/sign-in?next=" + encodeURIComponent(`/reports/${reference.toUpperCase()}?from=notification`));
  const report = await (await getReportModule()).getPublic(reference.toUpperCase());
  if (!report) {
    const resident = fromNotification ? notificationResident : await getVerifiedResident();
    const owned = resident ? await (await getReportModule()).getMine(resident.uid, reference.toUpperCase()) : null;
    if (!owned) {
      const canonical = await getPublicCanonicalReference(reference.toUpperCase());
      if (canonical) redirect("/reports/" + canonical);
      if (fromNotification) {
        return <ReportUnavailable reference={reference.toUpperCase()} />;
      }
      notFound();
    }
    return <ReportDetail privateReceipt archived={!!owned.archivedAt} ownedReport={owned} report={residentReportDetail(owned)} />;
  }
  const demonstration = discoveryMode() === "demo";
  const resident = fromNotification ? notificationResident : !demonstration ? await getVerifiedResident() : null;
  const owned = resident ? await (await getReportModule()).getMine(resident.uid, report.reference) : undefined;
  const canRespond = report.status === "Resolved" && !!resident && !!owned && await hasPilotAccess(resident);
  const categoryLabel = (await getDiscoveryCategories()).find(category => category.id === report.category)?.label;
  return <ReportDetail report={report} ownedReport={owned ?? undefined} canRespond={canRespond} categoryLabel={categoryLabel} demonstration={demonstration} />;
}
