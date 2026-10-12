import { redirect } from "next/navigation";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { PilotAccessPanel } from "@/features/auth/pilot-access-panel";
import { getPublicPilotConfiguration, getPublicOperatingStatus } from "@/features/admin/firebase-administration-store";
import { ReportComposer } from "@/features/reports/report-composer";
export const dynamic = "force-dynamic";
export default async function NewReportPage() {
  const resident = await getVerifiedResident();
  if (!resident) redirect("/sign-in?next=/reports/new");
  if (!(await hasPilotAccess(resident))) return <PilotAccessPanel />;
  const [configuration, operatingStatus] = await Promise.all([getPublicPilotConfiguration(), getPublicOperatingStatus()]);
  return (
    <ReportComposer
      residentUid={resident.uid}
      operatingStatus={operatingStatus}
      emergencyGuidance={configuration.emergency}
      categories={configuration.categories.filter(
        (category) => category.active,
      )}
    />
  );
}
