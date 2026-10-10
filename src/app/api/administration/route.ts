import { NextResponse } from "next/server";
import { getVerifiedOperator } from "@/features/auth/session";
import { getAdministrationModule } from "@/features/admin/firebase-administration-store";
import {
  AdministrationForbiddenError,
  AdministrationValidationError,
} from "@/features/admin/administration-module";

export async function GET() {
  const actor = await getVerifiedOperator();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  try {
    const administration = getAdministrationModule();
    const [users, configuration, invitations, audit] = await Promise.all([
      administration.listUsers(actor),
      administration.getConfiguration(actor),
      administration.listInvitations(actor),
      administration.listAudit(actor),
    ]);
    return NextResponse.json(
      { users, configuration, invitations, audit },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
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
    const body = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !body.input ||
      typeof body.input !== "object"
    )
      throw new AdministrationValidationError(
        "Choose a supported administration action.",
      );
    const administration = getAdministrationModule();
    if (body.action === "set-roles")
      await administration.setRoles(actor, body.input);
    else if (body.action === "set-access")
      await administration.setAccess(actor, body.input);
    else if (body.action === "set-invitation")
      await administration.setInvitation(actor, body.input);
    else if (body.action === "update-configuration")
      await administration.updateConfiguration(actor, body.input);
    else
      throw new AdministrationValidationError(
        "Choose a supported administration action.",
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  if (error instanceof AdministrationForbiddenError)
    return NextResponse.json(
      { error: error.message, code: "FORBIDDEN" },
      { status: 403 },
    );
  if (
    error instanceof AdministrationValidationError ||
    error instanceof SyntaxError
  )
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid request.",
        code: "VALIDATION",
      },
      { status: 422 },
    );
  return NextResponse.json(
    {
      error: "Administration request failed. Refresh and retry.",
      code: "UNAVAILABLE",
    },
    { status: 503 },
  );
}
