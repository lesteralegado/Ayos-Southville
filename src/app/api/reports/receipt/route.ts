import { getVerifiedResident } from "@/features/auth/session";
import { getReportReceipt } from "@/features/reports/firebase-report-store";
import { validDraftKey } from "@/features/reports/evidence-module";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const resident = await getVerifiedResident();
  if (!resident)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers },
    );
  const draftKey = new URL(request.url).searchParams.get("draftKey");
  if (!validDraftKey(draftKey))
    return Response.json({ error: "Invalid draft." }, { status: 422, headers });
  try {
    const receipt = await getReportReceipt(resident.uid, draftKey);
    return Response.json(receipt ?? { error: "No confirmed receipt yet." }, {
      status: receipt ? 200 : 404,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Receipt recovery is unavailable. Keep your draft and retry." },
      { status: 503, headers },
    );
  }
}
