import { isSameOrigin } from "@/features/pilot/request-origin";
import { NextResponse } from "next/server";
import { ReportPageError } from "@/features/reports/report-pages";
import { operationalMonitor } from "@/features/pilot/monitoring";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { getReportModule } from "@/features/reports/firebase-report-store";
import {
  EmergencyReportError,
  ReportValidationError,
} from "@/features/reports/report-module";
import { EvidenceError } from "@/features/reports/evidence-module";

function sameOrigin(request: Request) {
  return isSameOrigin(request);
}

export async function POST(request: Request) {
  if (
    !sameOrigin(request) ||
    !request.headers.get("content-type")?.startsWith("application/json")
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  const resident = await getVerifiedResident();
  if (!resident)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  try {
    if (!(await hasPilotAccess(resident)))
      return NextResponse.json(
        {
          error: "Pilot approval is required to submit a report.",
          code: "PILOT_ACCESS_REQUIRED",
        },
        { status: 403 },
      );
    const body: unknown = await readBoundedJson(request);
    const fields =
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? body
        : {};
    const receipt = await (
      await getReportModule()
    ).submit({ ...fields, residentUid: resident.uid });
    return NextResponse.json(receipt, { status: receipt.created ? 201 : 200 });
  } catch (error) {
    const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
    if (error instanceof EvidenceError)
      return NextResponse.json(
        {
          error: error.message,
          code: "EVIDENCE_INVALID",
          issues: { evidence: error.message },
        },
        { status: error.status },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    if (error instanceof EmergencyReportError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    if (error instanceof ReportValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, issues: error.issues },
        { status: 422 },
      );
    }
    operationalMonitor.record({ operation: "report", status: 503, code: "UNAVAILABLE" });
    return NextResponse.json(
      {
        error: "Submission could not be confirmed. Retry with the same draft.",
      },
      { status: 503 },
    );
  }
}

export async function GET(request?: Request) {
  const resident = await getVerifiedResident();
  if (!resident)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const headers = { "Cache-Control": "private, no-store" };
  try {
    if (request && new URL(request.url).searchParams.get("summary") === "1") {
      return NextResponse.json({ reportCount: await (await getReportModule()).countMine(resident.uid) }, { headers });
    }
    const cursor = request ? new URL(request.url).searchParams.get("cursor") : null;
    return NextResponse.json(await (await getReportModule()).listMinePage(resident.uid, cursor), { headers });
  } catch (error) {
    if (error instanceof ReportPageError) return NextResponse.json({ error: error.message, code: error.code }, { status: 422, headers });
    return NextResponse.json({ error: "Report history is unavailable. Retry loading your reports." }, { status: 503, headers });
  }
}
