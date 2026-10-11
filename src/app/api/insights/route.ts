import { NextResponse } from "next/server";
import { getPublicPilotInsights } from "@/features/admin/firebase-pilot-insights";
import { discoveryMode, getDiscoveryCategories } from "@/features/reports/firebase-discovery";
import { DiscoveryError } from "@/features/reports/discovery-module";
export async function GET() {
  try {
    const [insights, categories] = await Promise.all([getPublicPilotInsights(), getDiscoveryCategories()]);
    return NextResponse.json({ insights, categories, mode: discoveryMode() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ code: error instanceof DiscoveryError ? error.code : "UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
