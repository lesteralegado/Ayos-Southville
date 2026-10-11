import { readApprovedPublicEvidence } from "@/features/reports/firebase-evidence-store";
import { EvidenceError } from "@/features/reports/evidence-module";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const photo = await readApprovedPublicEvidence((await context.params).id);
    return new Response(Uint8Array.from(photo.bytes), { headers: { ...headers, "Content-Type": photo.type, "Content-Disposition": 'inline; filename="approved-evidence.jpg"' } });
  } catch (error) {
    return Response.json({ error: "Photo unavailable." }, { status: error instanceof EvidenceError ? error.status : 503, headers });
  }
}
