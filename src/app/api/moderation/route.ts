import { NextResponse } from "next/server";
import { operationalMonitor } from "@/features/pilot/monitoring";
import { readBoundedJson, protectionResponse } from "@/features/pilot/security-module";
import { getVerifiedOperator, hasPilotAccess } from "@/features/auth/session";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";
import {
  ModerationConflictError,
  ModerationForbiddenError,
  ModerationNotFoundError,
  ModerationValidationError,
} from "@/features/reports/moderation-module";
const headers = { "Cache-Control": "private, no-store" };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
export async function GET() {
  const actor = await getVerifiedOperator();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  try {
    if (!(await hasPilotAccess({ uid: actor.uid, email: actor.email, email_verified: true })))
      throw new ModerationForbiddenError();
    return NextResponse.json(
      { reports: await getModerationModule().listWorkspace(actor) },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  if (
    !sameOrigin(request) ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const actor = await getVerifiedOperator();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  try {
    if (!(await hasPilotAccess({ uid: actor.uid, email: actor.email, email_verified: true })))
      throw new ModerationForbiddenError();
    const body = (await readBoundedJson(request)) as Record<string, unknown>;
    if (
      !body ||
      typeof body !== "object" ||
      !body.input ||
      typeof body.input !== "object"
    )
      throw new ModerationValidationError("Provide complete action details.");
    const inputRecord = body.input as Record<string, unknown>;
    if (
      (!Number.isSafeInteger(inputRecord.expectedRevision) ||
        Number(inputRecord.expectedRevision) < 0)
    )
      throw new ModerationValidationError(
        "Reload the report before taking an action.",
      );
    if (
      ["assign", "transition"].includes(String(body.action)) &&
      (!inputRecord.update ||
        typeof inputRecord.update !== "object" ||
        !("en" in inputRecord.update) ||
        !("fil" in inputRecord.update))
    )
      throw new ModerationValidationError(
        "Provide English and Filipino updates.",
      );
    const moderation = getModerationModule();
    if (body.action === "accept")
      await moderation.accept(
        actor,
        body.input as Parameters<typeof moderation.accept>[1],
      );
    else if (body.action === "reject")
      await moderation.reject(
        actor,
        body.input as Parameters<typeof moderation.reject>[1],
      );
    else if (body.action === "merge")
      await moderation.merge(
        actor,
        body.input as Parameters<typeof moderation.merge>[1],
      );
    else if (body.action === "assign") {
      const input = body.input as Parameters<typeof moderation.assign>[1];
      const configuration = await getPublicPilotConfiguration();
      if (
        !configuration.destinations.some(
          (destination) =>
            destination.active && destination.id === input?.destination,
        )
      )
        throw new ModerationValidationError(
          "Choose an active responsible destination.",
        );
      await moderation.assign(actor, input);
    } else if (body.action === "transition")
      await moderation.transition(
        actor,
        body.input as Parameters<typeof moderation.transition>[1],
      );
    else if (body.action === "respond-to-resolution")
      await moderation.respondToResolution(
        actor,
        body.input as Parameters<typeof moderation.respondToResolution>[1],
      );
    else
      throw new ModerationValidationError(
        "Choose a supported moderation action.",
      );
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
  if (error instanceof ModerationConflictError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 409, headers },
    );
  if (error instanceof ModerationForbiddenError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 403, headers },
    );
  if (error instanceof ModerationNotFoundError)
    return NextResponse.json({ error: error.message }, { status: 404 });
  if (
    error instanceof ModerationValidationError ||
    error instanceof SyntaxError
  )
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid request.",
        code: "VALIDATION",
      },
      { status: 422, headers },
    );
  operationalMonitor.record({ operation: "moderation", status: 503, code: "UNAVAILABLE" });
  return NextResponse.json(
    { error: "The moderation action could not be completed." },
    { status: 503 },
  );
}
