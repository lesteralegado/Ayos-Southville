import { NextResponse } from "next/server";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { getVerifiedOperator } from "@/features/auth/session";
import { getPilotMeasurement } from "@/features/pilot/firebase-pilot-measurement";
import { PilotMeasurementConflictError, PilotMeasurementForbiddenError, PilotMeasurementValidationError } from "@/features/pilot/pilot-measurement";
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
export async function GET() {
  const actor = await getVerifiedOperator();
  if (!actor) return response({ error: "Authentication required.", code: "AUTHENTICATION" }, 401);
  try { return response(await getPilotMeasurement().read(actor)); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Invalid request.", code: "FORBIDDEN" }, 403);
  const actor = await getVerifiedOperator();
  if (!actor) return response({ error: "Authentication required.", code: "AUTHENTICATION" }, 401);
  try {
    const input = await readBoundedJson(request) as Record<string, unknown>, measurement = getPilotMeasurement();
    if (input?.action === "start-trial") await measurement.startTrial(actor, input);
    else if (input?.action === "review-trial") await measurement.reviewTrial(actor, input);
    else await measurement.record(actor, input);
    return response({ ok: true }, 201);
  } catch (error) { return protectionResponse(error) ?? failure(error); }
}
function failure(error: unknown) {
  if (error instanceof PilotMeasurementForbiddenError) return response({ error: error.message, code: error.code }, 403);
  if (error instanceof PilotMeasurementConflictError) return response({ error: error.message, code: error.code }, 409);
  if (error instanceof PilotMeasurementValidationError || error instanceof SyntaxError) return response({ error: error.message, code: "VALIDATION" }, 422);
  return response({ error: "Pilot measurement request failed.", code: "UNAVAILABLE" }, 503);
}
