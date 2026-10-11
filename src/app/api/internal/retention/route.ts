import { workerAuthorized } from "@/features/pilot/internal-authorization";
import { runRetention } from "@/features/pilot/firebase-retention";
import { readBoundedJson } from "@/features/pilot/security-module";
import { PrivacyError } from "@/features/pilot/privacy-module";
export const maxDuration = 120;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!workerAuthorized(request, process.env.RETENTION_WORKER_SECRET)) return Response.json({ code: "AUTH" }, { status: 401, headers });
  try {
    const input = await readBoundedJson(request) as { mode?: string };
    if (!input || !["dry-run", "apply"].includes(input.mode ?? "")) throw new PrivacyError(422, "VALIDATION");
    return Response.json(await runRetention(input.mode === "apply"), { headers });
  } catch (error) {
    return Response.json({ code: error instanceof PrivacyError ? error.code : "UNAVAILABLE", error: "Cleanup failed. Review the operations run record." }, { status: error instanceof PrivacyError ? error.status : 503, headers });
  }
}
