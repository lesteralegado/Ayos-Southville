import { NextResponse } from "next/server";
import { getVerifiedResident, getVerifiedOperator, hasPilotEligibility } from "@/features/auth/session";
import { isSameOrigin } from "@/features/pilot/request-origin";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { changeResidentReport, listRemovalRequests, ResidentReportActionError } from "@/features/reports/resident-report-actions";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request, context: { params: Promise<{ reference: string }> }) {
  if (!isSameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403, headers });
  try {
    const resident = await getVerifiedResident();
    if (!resident) return NextResponse.json({ code: "AUTH" }, { status: 401, headers });
    const body = await readBoundedJson(request) as { action?: unknown; confirmed?: unknown } | null;
    if (!body || body.confirmed !== true || (body.action !== "withdraw" && body.action !== "request-removal" && body.action !== "request-archive")) throw new ResidentReportActionError(422, "VALIDATION");
    return NextResponse.json(await changeResidentReport(resident.uid, (await context.params).reference, body.action), { headers });
  } catch (error) {
    const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
    return NextResponse.json({ code: error instanceof ResidentReportActionError ? error.code : "UNAVAILABLE" }, { status: error instanceof ResidentReportActionError ? error.status : error instanceof SyntaxError ? 422 : 503, headers });
  }
}
export async function GET(request?: Request) {
  try {
    const actor = await getVerifiedOperator();
    if (!actor) return NextResponse.json({ code: "AUTH" }, { status: 401, headers });
    if (!(await hasPilotEligibility({ uid: actor.uid, email_verified: true }))) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403, headers });
    return NextResponse.json(await listRemovalRequests(actor, request ? new URL(request.url).searchParams.get("cursor") : null), { headers });
  } catch (error) {
    return NextResponse.json({ code: error instanceof ResidentReportActionError ? error.code : "UNAVAILABLE" }, { status: error instanceof ResidentReportActionError ? error.status : 503, headers });
  }
}
