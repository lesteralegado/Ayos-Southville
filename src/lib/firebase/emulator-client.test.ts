import { vi } from "vitest";
import { deleteApp, getApps } from "firebase/app";
import { getFirebaseClient } from "./client";
afterEach(async () => { await Promise.all(getApps().map(deleteApp)); vi.unstubAllEnvs(); });
it("rejects emulator browser connections in a production build", () => {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_FIREBASE_EMULATORS: "true", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ayos-southville-local", NEXT_PUBLIC_FIREBASE_API_KEY: "local-emulator-not-a-real-key", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost", NEXT_PUBLIC_FIREBASE_APP_ID: "local-emulator-app", NODE_ENV: "production" })) vi.stubEnv(key, value);
  expect(() => getFirebaseClient()).toThrow(/Local emulator configuration/);
});
it("connects browser authentication to loopback instead of cloud Firebase", () => {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_FIREBASE_EMULATORS: "true", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ayos-southville-local", NEXT_PUBLIC_FIREBASE_API_KEY: "local-emulator-not-a-real-key", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost", NEXT_PUBLIC_FIREBASE_APP_ID: "local-emulator-app" })) vi.stubEnv(key, value);
  expect(getFirebaseClient().auth.emulatorConfig).toMatchObject({ host: "127.0.0.1", port: 9099 });
  expect(getFirebaseClient().auth.emulatorConfig).toMatchObject({ host: "127.0.0.1", port: 9099 });
});
