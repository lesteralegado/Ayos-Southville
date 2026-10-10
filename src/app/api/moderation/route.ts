import { NextResponse } from "next/server";
import { getVerifiedOperator } from "@/features/auth/session";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";
import { ModerationForbiddenError, ModerationNotFoundError, ModerationValidationError } from "@/features/reports/moderation-module";

function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return origin !== null && origin === new URL(request.url).origin; }
export async function GET() {
  const actor = await getVerifiedOperator(); if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try { return NextResponse.json({ reports: await getModerationModule().listQueue(actor) }); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const actor = await getVerifiedOperator(); if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>; const moderation = getModerationModule();
    if (body.action === "accept") await moderation.accept(actor, body.input as Parameters<typeof moderation.accept>[1]);
    else if (body.action === "reject") await moderation.reject(actor, body.input as Parameters<typeof moderation.reject>[1]);
    else if (body.action === "merge") await moderation.merge(actor, body.input as Parameters<typeof moderation.merge>[1]);
    else if (body.action === "assign") await moderation.assign(actor, body.input as Parameters<typeof moderation.assign>[1]);
    else if (body.action === "transition") await moderation.transition(actor, body.input as Parameters<typeof moderation.transition>[1]);
    else if (body.action === "respond-to-resolution") await moderation.respondToResolution(actor, body.input as Parameters<typeof moderation.respondToResolution>[1]);
    else throw new ModerationValidationError("Choose a supported moderation action.");
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
function failure(error: unknown) {
  if (error instanceof ModerationForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ModerationNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof ModerationValidationError || error instanceof SyntaxError) return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 422 });
  return NextResponse.json({ error: "The moderation action could not be completed." }, { status: 503 });
}