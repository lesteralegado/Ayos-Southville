import nextEnvironment from "@next/env";
nextEnvironment.loadEnvConfig(process.cwd());
const command = process.argv[2] ?? "check-env";
const required = ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "FIREBASE_STORAGE_BUCKET", "APP_SITE_URL", "AUDIT_PSEUDONYM_SECRET", "RETENTION_WORKER_SECRET"];
const env = process.env;
function site() {
  const value = process.argv.find(arg => arg.startsWith("--site="))?.slice(7) ?? env.APP_SITE_URL;
  const url = new URL(value);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Invalid site");
  return url.origin;
}
try {
  if (command === "check-env") {
    const missing = required.filter(key => !env[key]);
    for (const key of ["AUDIT_PSEUDONYM_SECRET", "RETENTION_WORKER_SECRET"]) if (env[key] && env[key].length < 32) missing.push(key);
    const applyTargetPinned = !!env.RETENTION_TARGET_PROJECT && env.RETENTION_TARGET_PROJECT === env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && !!env.RETENTION_TARGET_BUCKET && env.RETENTION_TARGET_BUCKET === env.FIREBASE_STORAGE_BUCKET;
    console.log(JSON.stringify({ configured: missing.length === 0, missing, destructiveCleanupEnabled: env.RETENTION_APPLY_ENABLED === "true", applyTargetPinned,
      isolatedRestoreConfigured: !!env.RESTORE_TEST_PROJECT_ID && env.RESTORE_TEST_PROJECT_ID.endsWith("-restore-test") && env.RESTORE_TEST_PROJECT_ID !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && !!env.RESTORE_TEST_STORAGE_BUCKET && env.RESTORE_TEST_STORAGE_BUCKET !== env.FIREBASE_STORAGE_BUCKET && !!env.RESTORE_TEST_CLIENT_EMAIL && !!env.RESTORE_TEST_PRIVATE_KEY }));
    if (missing.length || (env.RETENTION_APPLY_ENABLED === "true" && !applyTargetPinned)) process.exitCode = 1;
  } else if (command === "uptime") {
    const response = await fetch(site() + "/api/health", { signal: AbortSignal.timeout(10000), redirect: "error" });
    const healthy = response.ok && (await response.json()).status === "ok";
    console.log(JSON.stringify({ operation: "uptime", healthy, status: response.status })); if (!healthy) process.exitCode = 1;
  } else if (command === "cleanup") {
    const apply = process.argv.includes("--apply");
    if (!env.RETENTION_WORKER_SECRET || env.RETENTION_WORKER_SECRET.length < 32) throw new Error("Missing worker configuration");
    if (apply && (!process.argv.includes(`--project=${env.RETENTION_TARGET_PROJECT}`) || !process.argv.includes(`--bucket=${env.RETENTION_TARGET_BUCKET}`) || !env.RETENTION_TARGET_PROJECT || !env.RETENTION_TARGET_BUCKET)) throw new Error("Explicit targets required");
    const response = await fetch(site() + "/api/internal/retention", { method: "POST", redirect: "error", headers: { authorization: `Bearer ${env.RETENTION_WORKER_SECRET}`, "content-type": "application/json" }, body: JSON.stringify({ mode: apply ? "apply" : "dry-run" }), signal: AbortSignal.timeout(115000) });
    const result = await response.json();
    console.log(JSON.stringify({ operation: "cleanup", status: response.status, mode: result.mode, eligible: result.eligible, removed: result.removed, deletedAccounts: result.deletedAccounts, completed: result.status === "complete" }));
    if (!response.ok || result.status !== "complete") process.exitCode = 1;
  } else throw new Error("Unsupported command");
} catch { console.log(JSON.stringify({ operation: command === "uptime" ? "uptime" : "operations", status: "unavailable", code: "CHECK_CONFIGURATION_OR_RUN_RECORD" })); process.exitCode = 1; }
