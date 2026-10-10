import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import { ReportComposer } from "@/features/reports/report-composer";
export const dynamic = "force-dynamic";
export default async function NewReportPage(){const resident=await getVerifiedResident(); if(!resident)redirect("/sign-in?next=/reports/new"); const configuration=await getPublicPilotConfiguration(); return <ReportComposer emergencyGuidance={configuration.emergency} categories={configuration.categories.filter((category) => category.active)}/>;}