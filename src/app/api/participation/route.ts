import { getVerifiedResident, hasPilotEligibility } from "@/features/auth/session";
import { getAdministrationModule } from "@/features/admin/firebase-administration-store";
import { consentVersion } from "@/features/pilot/participation-consent";
import { protectionResponse, readBoundedJson } from "@/features/pilot/security-module";
import { operationalMonitor } from "@/features/pilot/monitoring";
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  const protectedFailure = protectionResponse(error);
  if (protectedFailure) return protectedFailure;
  if (error instanceof SyntaxError) return Response.json({ code: "VALIDATION" }, { status: 422, headers });
  operationalMonitor.record({ operation: "privacy", status: 503, code: "UNAVAILABLE" });
  return Response.json({ code: "UNAVAILABLE" }, { status: 503, headers });
}
export async function GET() {
  const resident = await getVerifiedResident();
  if (!resident) return Response.json({ code: "AUTH" }, { status: 401, headers });
  try {
    const [eligible, receipt] = await Promise.all([
      hasPilotEligibility(resident),
      getAdministrationModule().getConsent({ uid: resident.uid, emailVerified: true }),
    ]);
    return Response.json({ eligible, receipt, version: consentVersion }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ code: "FORBIDDEN" }, { status: 403, headers });
  const resident = await getVerifiedResident();
  if (!resident) return Response.json({ code: "AUTH" }, { status: 401, headers });
  try {
    const input = await readBoundedJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ code: "VALIDATION" }, { status: 422, headers });
    const fields = input as Record<string, unknown>;
    const receipt = await getAdministrationModule().acceptConsent({ uid: resident.uid, email: resident.email, emailVerified: true }, {
      version: fields.version, adultAcknowledged: fields.adultAcknowledged, consent: fields.consent, locale: fields.locale,
    });
    return Response.json({ receipt }, { headers });
  } catch (error) { return failure(error); }
}
