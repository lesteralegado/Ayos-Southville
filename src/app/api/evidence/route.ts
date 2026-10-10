import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import {
  getEvidenceModule,
  cancelEvidenceUpload,
} from "@/features/reports/firebase-evidence-store";
import {
  EvidenceError,
  validDraftKey,
} from "@/features/reports/evidence-module";

const headers = { "Cache-Control": "private, no-store" };
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Invalid request." },
      { status: 403, headers },
    );
  const resident = await getVerifiedResident();
  if (!resident)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers },
    );
  try {
    const url = new URL(request.url);
    const draftKey = url.searchParams.get("draftKey");
    const slotId = url.searchParams.get("slotId");
    if (!validDraftKey(draftKey) || !validDraftKey(slotId))
      throw new EvidenceError("Invalid upload draft.");
    await cancelEvidenceUpload({ residentUid: resident.uid, draftKey, slotId });
    return Response.json({ removed: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof EvidenceError
          ? error.message
          : "Private photos are unavailable. Keep your draft and retry.",
      code: "EVIDENCE_UNAVAILABLE",
    },
    { status: error instanceof EvidenceError ? error.status : 503, headers },
  );
}
export async function GET(request: Request) {
  const resident = await getVerifiedResident();
  if (!resident)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers },
    );
  try {
    if (!(await hasPilotAccess(resident)))
      return Response.json(
        { error: "Pilot approval required." },
        { status: 403, headers },
      );
    const assets = await getEvidenceModule().list(
      resident.uid,
      new URL(request.url).searchParams.get("draftKey") ?? "",
    );
    return Response.json({ assets }, { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Invalid request." },
      { status: 403, headers },
    );
  const resident = await getVerifiedResident();
  if (!resident)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers },
    );
  try {
    if (!(await hasPilotAccess(resident)))
      return Response.json(
        { error: "Pilot approval required." },
        { status: 403, headers },
      );
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
      throw new EvidenceError("Use a photo upload request.");
    // Bound the body while streaming; Content-Length alone is not trustworthy.
    const reader = request.body?.getReader();
    if (!reader) throw new EvidenceError("Choose a photo.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_700_000) {
        await reader.cancel();
        throw new EvidenceError("The compressed photo is too large.", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type")! },
      body: bytes,
    }).formData();
    const file = form.get("photo");
    const draftKey = form.get("draftKey");
    const slotId = form.get("slotId");
    if (
      !(file instanceof File) ||
      typeof draftKey !== "string" ||
      typeof slotId !== "string"
    )
      throw new EvidenceError("Choose a photo and valid draft.");
    const asset = await getEvidenceModule().upload({
      residentUid: resident.uid,
      draftKey,
      slotId,
      bytes: new Uint8Array(await file.arrayBuffer()),
      type: file.type,
    });
    return Response.json({ asset }, { status: 201, headers });
  } catch (error) {
    return failure(error);
  }
}
