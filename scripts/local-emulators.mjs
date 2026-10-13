import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { localEmulatorHosts, localEmulatorProject } from "../src/lib/firebase/local-emulator.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules/firebase-tools/lib/bin/firebase.js");
const command = process.argv[2] ?? "check";
const java = spawnSync("java", ["-version"], { encoding: "utf8", windowsHide: true });
const javaMajor = Number(`${java.stderr ?? ""}${java.stdout ?? ""}`.match(/version "(\d+)/)?.[1] ?? 0);
const env = { ...process.env };
for (const key of ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_TOKEN", "FIREBASE_CONFIG", "GOOGLE_APPLICATION_CREDENTIALS", "DEMO_SEED_PASSWORD", "RESEND_API_KEY", "RESEND_FROM", "EMAIL_DELIVERY_SECRET", "RESTORE_TEST_PROJECT_ID", "RESTORE_TEST_CLIENT_EMAIL", "RESTORE_TEST_PRIVATE_KEY", "RESTORE_TEST_STORAGE_BUCKET", "VERCEL", "VERCEL_ENV"])
  env[key] = "";
Object.assign(env, {
  NODE_ENV: "development", NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: localEmulatorProject, GCLOUD_PROJECT: localEmulatorProject,
  NEXT_PUBLIC_FIREBASE_API_KEY: "local-emulator-not-a-real-key", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost", NEXT_PUBLIC_FIREBASE_APP_ID: "local-emulator-app",
  FIREBASE_AUTH_EMULATOR_HOST: localEmulatorHosts.auth, FIRESTORE_EMULATOR_HOST: localEmulatorHosts.firestore, FIREBASE_STORAGE_EMULATOR_HOST: localEmulatorHosts.storage,
  FIREBASE_STORAGE_BUCKET: `${localEmulatorProject}.appspot.com`, APP_SITE_URL: "http://127.0.0.1:3001",
  NEXT_PUBLIC_DEMO_MODE: "false", DEMO_MODE: "false", RESEND_SENDER_VERIFIED: "false",
  AUDIT_PSEUDONYM_SECRET: "synthetic-local-audit-key-not-for-production-2026",
  RETENTION_WORKER_SECRET: randomBytes(32).toString("hex"), RETENTION_APPLY_ENABLED: "false", RETENTION_TARGET_PROJECT: "", RETENTION_TARGET_BUCKET: "",
});
const plan = { project: localEmulatorProject, app: env.APP_SITE_URL, auth: localEmulatorHosts.auth, firestore: localEmulatorHosts.firestore, storage: localEmulatorHosts.storage, emulatorUI: "http://127.0.0.1:4000", emailDelivery: false, destructiveCleanup: false, java21Available: java.status === 0 && javaMajor >= 21, firebaseCLIAvailable: existsSync(cli) };

async function main() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") throw new Error("Local emulators cannot run in a hosted or production environment.");
  if (process.argv.length > 3 || !["check", "emulators", "app", "seed"].includes(command)) throw new Error("Use check, emulators, app or seed with no target overrides.");
  if (command === "check") { console.log(JSON.stringify(plan)); return; }
  if (!plan.java21Available) throw new Error("Install Java 21 or newer, reopen your terminal, then run npm run local:check.");
  if (!plan.firebaseCLIAvailable) throw new Error("Run npm install to install the pinned local Firebase CLI.");
  if (command === "app" || command === "seed") {
    const response = await fetch("http://127.0.0.1:4400/emulators", { signal: AbortSignal.timeout(3000) });
    const services = await response.json();
    if (!response.ok || !["auth", "firestore", "storage"].every(name => services[name]?.host === "127.0.0.1" && `${services[name].host}:${services[name].port}` === localEmulatorHosts[name])) throw new Error("Start all local emulators first with npm run local:emulators.");
  }
  console.log("SYNTHETIC LOCAL TESTING ONLY — no cloud project, real accounts, email delivery or release approval.");
  const args = command === "emulators" ? [cli, "emulators:start", "--config", "firebase.local.json", "--project", localEmulatorProject, "--only", "auth,firestore,storage", "--non-interactive"] : command === "seed" ? [path.join(root, "scripts/seed-local-emulators.mjs")] : [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3001"];
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit", windowsHide: true });
  child.on("error", () => { console.error("Local process could not start."); process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = code ?? 1; });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Local setup unavailable."); process.exitCode = 1; });
