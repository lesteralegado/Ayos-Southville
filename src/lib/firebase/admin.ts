import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertLocalEmulatorServer } from "./local-emulator";

function getAdminApp() {
  const emulator = assertLocalEmulatorServer(process.env);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (getApps().length) {
    const app = getApp();
    if (emulator && app.options.projectId !== projectId) throw new Error("Local emulator project differs from the cached Firebase connection.");
    return app;
  }
  if (emulator) return initializeApp({ projectId });
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin configuration is incomplete.");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getFirebaseAdmin() {
  const app = getAdminApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}
