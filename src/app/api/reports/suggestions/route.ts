import { getVerifiedResident, hasPilotAccess } from "@/features/auth/session";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
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
    const input = await request.json();
    const configuration = await getPublicPilotConfiguration();
    if (
      !input ||
      typeof input.category !== "string" ||
      !configuration.categories.some(
        (category) => category.active && category.id === input.category,
      ) ||
      typeof input.latitude !== "number" ||
      typeof input.longitude !== "number" ||
      !Number.isFinite(input.latitude) ||
      !Number.isFinite(input.longitude) ||
      Math.abs(input.latitude) > 90 ||
      Math.abs(input.longitude) > 180
    )
      return Response.json(
        { error: "Choose valid coordinates and a category." },
        { status: 422, headers },
      );
    const suggestions = await getEngagementModule().suggestDuplicates(input);
    return Response.json({ suggestions }, { headers });
  } catch (error) {
    return Response.json(
      { error: "Duplicate checking is unavailable. Retry later." },
      { status: error instanceof SyntaxError ? 400 : 503, headers },
    );
  }
}
