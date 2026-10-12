import { getPublicOperatingStatus } from "@/features/admin/firebase-administration-store";
export async function GET() {
  try {
    return Response.json(await getPublicOperatingStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ code: "UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
