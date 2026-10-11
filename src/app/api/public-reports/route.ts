import { NextResponse } from "next/server";
import { getDiscoveryCategories, getDiscoveryModule } from "@/features/reports/firebase-discovery";
import { DiscoveryError } from "@/features/reports/discovery-module";

export async function GET(request: Request) {
  try {
    const [result, categories] = await Promise.all([
      getDiscoveryModule().list(new URL(request.url).searchParams), getDiscoveryCategories(),
    ]);
    return NextResponse.json({ ...result, categories }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ code: error instanceof DiscoveryError ? error.code : "UNAVAILABLE" }, {
      status: error instanceof DiscoveryError ? error.status : 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
