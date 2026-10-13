import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertLocalEmulatorServer, localEmulatorProject } from "../src/lib/firebase/local-emulator.ts";

let app;
try {
  if (!assertLocalEmulatorServer(process.env)) throw new Error("Use npm run local:seed with the isolated local emulators.");
  app = initializeApp({ projectId: localEmulatorProject });
  const auth = getAuth(app), db = getFirestore(app);
  const password = "LocalTestOnly-2026!";
  for (const [uid, email, alias, roles] of [
    ["local-owner", "local-owner@example.test", "LocalOwner", ["Administrator"]],
    ["local-backup", "local-backup@example.test", "LocalBackup", ["Administrator"]],
    ["local-resident", "local-resident@example.test", "LocalResident", ["Resident"]],
  ]) {
    try { await auth.getUser(uid); }
    catch (error) { if (error.code !== "auth/user-not-found") throw error; await auth.createUser({ uid, email, password, emailVerified: true }); }
    const ref = db.collection("residentProfiles").doc(uid);
    if (!(await ref.get()).exists) await ref.create({ publicAlias: alias, roles, pilotAccess: "approved", createdAt: new Date().toISOString() });
  }
  console.log("Synthetic LOCAL accounts only: local-owner@example.test, local-backup@example.test, local-resident@example.test");
  console.log(`Synthetic LOCAL password: ${password}. Never reuse it for any cloud account.`);
  console.log("No consent, coverage, trial approval, reports or repair outcomes were seeded. Accept the disclosure through the local application before submitting.");
} catch { console.error("Local account setup unavailable. Verify all local emulators are running; no cloud fallback is permitted."); process.exitCode = 1; }
finally { if (app) await deleteApp(app); }
