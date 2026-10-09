import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
  const app = getApps().length ? getApp() : initializeApp(getClientConfig());
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function getSessionlessAuth() {
  const { auth } = getFirebaseClient();
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}
