import { operationalMonitor } from "./monitoring";
import { operatingControlResponse } from "@/features/admin/pilot-operations";
export class ProtectionError extends Error {
  constructor(readonly code: "RATE_LIMIT" | "TOO_LARGE" | "FORBIDDEN" | "UNAVAILABLE", readonly status: number) {
    super(code === "RATE_LIMIT" ? "Too many requests. Wait before retrying." : code === "TOO_LARGE" ? "The request is too large." : "The operation is unavailable. Reload and retry.");
  }
}
export type SensitiveOperation = "report" | "evidence" | "engagement" | "operator" | "session" | "privacy";
const limits: Record<SensitiveOperation, number> = { report: 10, evidence: 50, engagement: 120, operator: 120, session: 20, privacy: 10 };
export function createMutationProtection({ consume, now = () => new Date() }: {
  consume(key: string, limit: number, expiresAt: string): Promise<boolean>;
  now?: () => Date;
}) {
  return { async check(uid: string, operation: SensitiveOperation) {
    const window = Math.floor(now().getTime() / 3_600_000);
    if (!await consume(`${uid}:${operation}:${window}`, limits[operation], new Date((window + 2) * 3_600_000).toISOString()))
      throw new ProtectionError("RATE_LIMIT", 429);
  } };
}
export async function readBoundedJson(request: Request, limit = 32_768): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON.");
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel(); }, 10_000);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new ProtectionError("TOO_LARGE", 413); }
      chunks.push(value);
    }
    if (timedOut) throw new ProtectionError("UNAVAILABLE", 408);
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
export function protectionResponse(error: unknown) {
  const operatingFailure = operatingControlResponse(error);
  if (operatingFailure) return operatingFailure;
  if (!(error instanceof ProtectionError)) return null;
  operationalMonitor.record({ operation: "privacy", status: error.status, code: error.code });
  return Response.json({ code: error.code, error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store", ...(error.status === 429 ? { "Retry-After": "3600" } : {}) } });
}
