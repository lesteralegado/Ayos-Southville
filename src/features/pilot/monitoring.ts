const operations = ["retention", "privacy", "report", "evidence", "engagement", "moderation", "administration", "session", "health"];
const codes = ["UNAVAILABLE", "FORBIDDEN", "AUTH", "RATE_LIMIT", "VALIDATION", "CONFLICT", "OK", "CLEANUP_DISABLED", "DRY_RUN_REQUIRED", "CAPACITY"];
export function createOperationalMonitor(emit: (event: { operation: string; status: number; code: string; durationMs: number }) => void) {
  return { record(input: Record<string, unknown>) {
    const operation = operations.includes(String(input.operation)) ? String(input.operation) : "privacy";
    const code = codes.includes(String(input.code)) ? String(input.code) : "UNAVAILABLE";
    const status = typeof input.status === "number" && Number.isInteger(input.status) && input.status >= 100 && input.status <= 599 ? input.status : 503;
    const durationMs = typeof input.durationMs === "number" && Number.isFinite(input.durationMs) ? Math.max(0, Math.min(120000, input.durationMs)) : 0;
    emit({ operation, status, code, durationMs });
  } };
}
export const operationalMonitor = createOperationalMonitor(event => console.info(JSON.stringify(event)));
