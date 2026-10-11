import { getVerifiedOperator } from "@/features/auth/session";
import { getPrivacyModule, operationsState, recordPilotEnd } from "@/features/pilot/firebase-privacy";
import { requirePrivacyAdmin, PrivacyError } from "@/features/pilot/privacy-module";
import { runRetention } from "@/features/pilot/firebase-retention";
import { readBoundedJson } from "@/features/pilot/security-module";
import { privacyFailure as failure } from "@/features/pilot/privacy-http";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const actor = await getVerifiedOperator();
    if (!actor) return Response.json({ code: "AUTH" }, { status: 401, headers });
    requirePrivacyAdmin(actor);
    return Response.json({ requests: await getPrivacyModule().list(actor), ...await operationsState() }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ code: "FORBIDDEN" }, { status: 403, headers });
  try {
    const actor = await getVerifiedOperator();
    if (!actor) return Response.json({ code: "AUTH" }, { status: 401, headers });
    requirePrivacyAdmin(actor);
    const input = await readBoundedJson(request) as { action?: string; id?: string; status?: "approved" | "cancelled"; date?: string; confirmed?: boolean };
    if (input?.action === "review") await getPrivacyModule().decide(actor, input.id!, input.status!);
    else if (input?.action === "pilot-end") await recordPilotEnd(actor, input.date, input.confirmed);
    else if (input?.action === "preview-cleanup") await runRetention(false);
    else throw new PrivacyError(422, "VALIDATION");
    return GET();
  } catch (error) { return failure(error); }
}
