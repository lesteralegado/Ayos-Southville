import { isSameOrigin } from "@/features/pilot/request-origin";
import { getVerifiedResident } from "@/features/auth/session";
import { getPrivacyModule } from "@/features/pilot/firebase-privacy";
import { readBoundedJson } from "@/features/pilot/security-module";
import { privacyFailure as failure } from "@/features/pilot/privacy-http";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const resident = await getVerifiedResident();
    if (!resident) return Response.json({ code: "AUTH" }, { status: 401, headers });
    const request = await getPrivacyModule().mine(resident.uid);
    return Response.json({ request: request ? { id: request.id, requestedAt: request.requestedAt, status: request.status, completedAt: request.completedAt } : null }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ code: "FORBIDDEN" }, { status: 403, headers });
  try {
    const resident = await getVerifiedResident();
    if (!resident) return Response.json({ code: "AUTH" }, { status: 401, headers });
    const input = await readBoundedJson(request) as { confirmed?: boolean };
    await getPrivacyModule().request(resident.uid, input?.confirmed);
    return GET();
  } catch (error) { return failure(error); }
}
