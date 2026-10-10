import { NextResponse } from "next/server";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
import type { EvidenceAsset } from "@/features/reports/report-module";
import { EngagementValidationError } from "@/features/reports/engagement-module";

export async function GET(_: Request, context: { params: Promise<{ reference: string }> }) {
  const resident = await getVerifiedResident();
  if (!resident) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { reference } = await context.params;
  return NextResponse.json(await getEngagementModule().getResidentState(resident.uid, reference.toUpperCase()));
}

export async function POST(request: Request, context: { params: Promise<{ reference: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const resident = await getVerifiedResident();
  if (!resident) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!await hasPilotAccess(resident)) return NextResponse.json({ error: "Pilot approval is required.", code: "PILOT_ACCESS_REQUIRED" }, { status: 403 });
  const { reference } = await context.params;
  const input = await request.json() as { action?: string; active?: boolean; evidence?: EvidenceAsset[] };
  const engagement = getEngagementModule();
  try {
    if (input.action === "affected" && typeof input.active === "boolean") return NextResponse.json(await engagement.setAffected({ residentUid: resident.uid, reference: reference.toUpperCase(), active: input.active, evidence: Array.isArray(input.evidence) ? input.evidence : [] }));
    if (input.action === "follow" && typeof input.active === "boolean") return NextResponse.json(await engagement.setFollow({ residentUid: resident.uid, reference: reference.toUpperCase(), active: input.active }));
  } catch (error) {
    if (error instanceof EngagementValidationError) return NextResponse.json({ error: error.message }, { status: 422 });
    throw error;
  }
  return NextResponse.json({ error: "Invalid engagement action." }, { status: 422 });
}
