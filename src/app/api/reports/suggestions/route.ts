import { NextResponse } from "next/server";
import { getVerifiedResident } from "@/features/auth/session";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import type { ReportCategory } from "@/features/reports/report-module";

export async function POST(request: Request) {
  if (!await getVerifiedResident()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const input = await request.json() as Record<string, unknown>;
  const configuration = await getPublicPilotConfiguration();
  const supportedCategories = configuration.categories.filter((category) => category.active).map((category) => category.id);
  if (!(typeof input.category === "string" && supportedCategories.includes(input.category)) || typeof input.latitude !== "number" || typeof input.longitude !== "number") {
    return NextResponse.json({ error: "Choose a category and map location first." }, { status: 422 });
  }
  const suggestions = await getEngagementModule().suggestDuplicates({ category: input.category as ReportCategory, latitude: input.latitude, longitude: input.longitude });
  return NextResponse.json({ suggestions });
}
