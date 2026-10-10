import { NextResponse } from "next/server";
import { getVerifiedResident } from "@/features/auth/session";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { EmergencyReportError, ReportValidationError } from "@/features/reports/report-module";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  const resident = await getVerifiedResident();
  if (!resident) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body: unknown = await request.json();
    const fields = typeof body === "object" && body !== null && !Array.isArray(body) ? body : {};
    const receipt = await (await getReportModule()).submit({ ...fields, residentUid: resident.uid });
    return NextResponse.json(receipt, { status: receipt.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    if (error instanceof EmergencyReportError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    if (error instanceof ReportValidationError) {
      return NextResponse.json({ error: error.message, code: error.code, issues: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: "Submission could not be confirmed. Retry with the same draft." }, { status: 503 });
  }
}

export async function GET() {
  const resident = await getVerifiedResident();
  if (!resident) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const reports = await (await getReportModule()).listMine(resident.uid);
  return NextResponse.json({ reports });
}
