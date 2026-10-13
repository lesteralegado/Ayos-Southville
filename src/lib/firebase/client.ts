import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { localEmulatorProject } from "./local-emulator";

const connectedApps = new WeakSet<object>();

function getClientConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value)) {
    throw new Error("Firebase client configuration is incomplete.");
  }
  return config as Record<keyof typeof config, string>;
}

export function getFirebaseClient() {
  const config = getClientConfig(), emulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";
  if (emulator && (process.env.NODE_ENV === "production" || config.projectId !== localEmulatorProject || (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname))))
    throw new Error("Local emulator configuration requires the isolated demo project on a loopback development site.");
  const app = getApps().length ? getApp() : initializeApp(config);
  if (emulator && app.options.projectId !== config.projectId) throw new Error("Local emulator project differs from the cached Firebase connection.");
  const auth = getAuth(app), db = getFirestore(app);
  if (emulator && !connectedApps.has(app)) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectedApps.add(app);
  }
  if (!emulator && auth.emulatorConfig) throw new Error("Restart before leaving local emulator mode.");
  return { auth, db };
}

export async function getSessionlessAuth() {
  const { auth } = getFirebaseClient();
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}
