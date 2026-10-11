import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getEvidenceBucket } from "@/features/reports/firebase-evidence-store";
import { operationalMonitor } from "@/features/pilot/monitoring";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    if ((process.env.AUDIT_PSEUDONYM_SECRET?.length ?? 0) < 32 || (process.env.RETENTION_WORKER_SECRET?.length ?? 0) < 32) throw new Error("Configuration unavailable");
    await Promise.all([getFirebaseAdmin().db.collection("pilotOperations").doc("current").get(), getEvidenceBucket().getMetadata()]);
    return Response.json({ status: "ok" }, { headers });
  } catch { operationalMonitor.record({ operation: "health", status: 503, code: "UNAVAILABLE" }); return Response.json({ status: "unavailable" }, { status: 503, headers }); }
}
