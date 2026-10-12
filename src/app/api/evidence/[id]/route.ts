import {
  getVerifiedResident,
  getVerifiedOperator,
  hasPilotEligibility,
} from "@/features/auth/session";
import { getEvidenceModule } from "@/features/reports/firebase-evidence-store";
import { EvidenceError } from "@/features/reports/evidence-module";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const failure = (error: unknown) =>
  Response.json(
    {
      error:
        error instanceof EvidenceError
          ? error.message
          : "Private photo unavailable. Retry later.",
    },
    { status: error instanceof EvidenceError ? error.status : 503, headers },
  );
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const resident = await getVerifiedResident();
  if (!resident)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers },
    );
  try {
    const operator = await getVerifiedOperator();
    const allowed =
      Boolean(
        operator?.roles.some((role) =>
          ["Moderator", "Coordinator", "Administrator"].includes(role),
        ),
      ) && (await hasPilotEligibility(resident));
    const photo = await getEvidenceModule().read(
      resident.uid,
      (await context.params).id,
      allowed,
    );
    return new Response(Uint8Array.from(photo.bytes), {
      headers: {
        ...headers,
        "Content-Type": photo.type,
        "Content-Disposition": 'inline; filename="evidence.jpg"',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
    await getEvidenceModule().remove(resident.uid, (await context.params).id);
    return Response.json({ removed: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}
