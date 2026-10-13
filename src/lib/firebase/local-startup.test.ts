// @vitest-environment node
import { spawnSync } from "node:child_process";
it("refuses to start the local workflow in a hosted environment", () => {
  const result = spawnSync(process.execPath, ["scripts/local-emulators.mjs", "app"], { encoding: "utf8", env: { ...process.env, VERCEL: "1" } });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("cannot run in a hosted or production environment");
});
it("local startup selects only synthetic loopback resources even when live values are inherited", () => {
  const result = spawnSync(process.execPath, ["scripts/local-emulators.mjs", "check"], { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "ayos-southville", FIREBASE_STORAGE_BUCKET: "live-bucket", FIREBASE_AUTH_EMULATOR_HOST: "cloud.example:9099", VERCEL: "", NODE_ENV: "test" } });
  const plan = JSON.parse(result.stdout);
  expect(plan).toMatchObject({ project: "demo-ayos-southville-local", app: "http://127.0.0.1:3001", auth: "127.0.0.1:9099", firestore: "127.0.0.1:8080", storage: "127.0.0.1:9199", emailDelivery: false, destructiveCleanup: false });
  expect(result.stdout).not.toMatch(/live-bucket|cloud.example|private_key|apiKey/);
});
