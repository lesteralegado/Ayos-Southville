import { PrivacyError } from "./privacy-module";
import { protectionResponse } from "./security-module";
import { operationalMonitor } from "./monitoring";
export function privacyFailure(error: unknown) {
  const protectedFailure = protectionResponse(error); if (protectedFailure) return protectedFailure;
  const status = error instanceof PrivacyError ? error.status : error instanceof SyntaxError ? 422 : 503;
  operationalMonitor.record({ operation: "privacy", status, code: error instanceof PrivacyError ? error.code : "UNAVAILABLE" });
  return Response.json({ code: error instanceof PrivacyError ? error.code : status === 422 ? "VALIDATION" : "UNAVAILABLE", error: "The request could not be confirmed. Reload and retry." }, { status, headers: { "Cache-Control": "private, no-store" } });
}
