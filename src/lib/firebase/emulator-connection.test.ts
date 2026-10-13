// @vitest-environment node
import { vi } from "vitest";
import { deleteApp as deleteAdminApp, getApps as adminApps, initializeApp } from "firebase-admin/app";
import { getFirebaseAdmin } from "./admin";
afterEach(async () => { await Promise.all(adminApps().map(deleteAdminApp)); vi.unstubAllEnvs(); });
function localEnvironment() {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_FIREBASE_EMULATORS: "true", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ayos-southville-local", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199", FIREBASE_STORAGE_BUCKET: "demo-ayos-southville-local.appspot.com", VERCEL: "", NODE_ENV: "test" })) vi.stubEnv(key, value);
}
it("never reuses a cached live Firebase connection in local emulator mode", () => {
  initializeApp({ projectId: "ayos-southville" });
  localEnvironment();
  expect(() => getFirebaseAdmin()).toThrow(/project/);
});
it("connects the administrator to the isolated project without a service-account key", () => {
  localEnvironment();
  const firebase = getFirebaseAdmin();
  expect(firebase.auth.app.options.projectId).toBe("demo-ayos-southville-local");
});
it.each(["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"])("refuses an incomplete local connection when %s is absent", key => {
  localEnvironment(); vi.stubEnv(key, "");
  expect(() => getFirebaseAdmin()).toThrow(/Local emulator configuration/);
});
it.each([
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "ayos-southville"],
  ["FIREBASE_STORAGE_BUCKET", "production-bucket"],
  ["FIREBASE_AUTH_EMULATOR_HOST", "remote.example:9099"],
  ["NEXT_PUBLIC_FIREBASE_EMULATORS", "false"],
  ["NODE_ENV", "production"],
])("refuses unsafe local overrides for %s", (key, value) => {
  localEnvironment(); vi.stubEnv(key, value);
  expect(() => getFirebaseAdmin()).toThrow(/Local emulator configuration/);
});
it("refuses emulator credentials on a hosted deployment before initializing Firebase", () => {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATORS", "true");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-ayos-southville-local");
  vi.stubEnv("VERCEL", "1");
  expect(() => getFirebaseAdmin()).toThrow(/Local emulator configuration/);
});
