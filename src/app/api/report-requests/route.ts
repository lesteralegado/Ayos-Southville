export { GET } from "../reports/[reference]/request/route";

import { NextResponse } from "next/server";
import { getVerifiedOperator, hasPilotEligibility } from "@/features/auth/session";
import { isSameOrigin } from "@/features/pilot/request-origin";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { archiveRequestedReport, ResidentReportActionError } from "@/features/reports/resident-report-actions";

export async function PATCH(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403, headers });
  try {
    const actor = await getVerifiedOperator();
    if (!actor) return NextResponse.json({ code: "AUTH" }, { status: 401, headers });
    if (!(await hasPilotEligibility({ uid: actor.uid, email_verified: true }))) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403, headers });
    const body = await readBoundedJson(request) as { reference?: unknown; reason?: unknown; confirmed?: unknown } | null;
    if (!body || body.confirmed !== true || typeof body.reference !== "string" || typeof body.reason !== "string") throw new ResidentReportActionError(422, "VALIDATION");
    return NextResponse.json(await archiveRequestedReport(actor, body.reference, body.reason), { headers });
  } catch (error) {
    const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
    return NextResponse.json({ code: error instanceof ResidentReportActionError ? error.code : "UNAVAILABLE" }, { status: error instanceof ResidentReportActionError ? error.status : error instanceof SyntaxError ? 422 : 503, headers });
  }
}
