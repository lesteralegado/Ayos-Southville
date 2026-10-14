import { isSameOrigin } from "@/features/pilot/request-origin";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { EvidenceError } from "@/features/reports/evidence-module";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
import type { EvidenceAsset } from "@/features/reports/report-module";
import { EngagementValidationError } from "@/features/reports/engagement-module";

export async function GET(
  _: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const resident = await getVerifiedResident();
  if (!resident)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const { reference } = await context.params;
  if (!/^[A-Z0-9-]{3,80}$/i.test(reference)) return NextResponse.json({ code: "VALIDATION" }, { status: 422 });
  try {
    const state = await getEngagementModule().getResidentState(resident.uid, reference.toUpperCase());
    return NextResponse.json({ affected: state.affected, following: state.following, supportingEvidence: state.supportingEvidence,
      uploadOwner: createHash("sha256").update(resident.uid).digest("hex") }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ code: "UNAVAILABLE", error: "Choices could not be loaded. Retry." }, { status: 503 }); }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  if (
    !isSameOrigin(request) ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const resident = await getVerifiedResident();
  if (!resident)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  if (!(await hasPilotAccess(resident)))
    return NextResponse.json(
      { error: "Pilot approval is required.", code: "PILOT_ACCESS_REQUIRED" },
      { status: 403 },
    );
  const { reference } = await context.params;
  try {
  if (!/^[A-Z0-9-]{3,80}$/i.test(reference)) throw new EngagementValidationError("Choose a valid report.");
  const input = (await readBoundedJson(request)) as {
    action?: string;
    active?: boolean;
    evidence?: EvidenceAsset[];
  };
  if (!input || typeof input !== "object" || Array.isArray(input) || (input.evidence !== undefined && !Array.isArray(input.evidence))) throw new EngagementValidationError("Choose a valid action.");
  // The persistence adapter verifies owned completed uploads and replaces client metadata.
  const engagement = getEngagementModule();
    if (input.action === "affected" && typeof input.active === "boolean")
      return NextResponse.json(
        await engagement.setAffected({
          residentUid: resident.uid,
          reference: reference.toUpperCase(),
          active: input.active,
          evidence: Array.isArray(input.evidence) ? input.evidence : [],
        }),
      );
    if (input.action === "follow" && typeof input.active === "boolean")
      return NextResponse.json(
        await engagement.setFollow({
          residentUid: resident.uid,
          reference: reference.toUpperCase(),
          active: input.active,
        }),
      );
  return NextResponse.json(
    { error: "Invalid engagement action." },
    { status: 422 },
  );
  } catch (error) {
    const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
    if (error instanceof EngagementValidationError || error instanceof SyntaxError || error instanceof EvidenceError)
      return NextResponse.json({ code: "VALIDATION", error: "Choose a valid action and completed owned photos." }, { status: error instanceof EvidenceError ? error.status : 422 });
    return NextResponse.json({ code: "UNAVAILABLE", error: "The update could not be confirmed. Reload and retry." }, { status: 503 });
  }
}
