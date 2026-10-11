import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnvironment from "@next/env";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
nextEnvironment.loadEnvConfig(process.cwd());
const env = process.env, project = env.RESTORE_TEST_PROJECT_ID, bucketName = env.RESTORE_TEST_STORAGE_BUCKET;
let app;
try {
  if (!project?.endsWith("-restore-test") || project === env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !bucketName || bucketName === env.FIREBASE_STORAGE_BUCKET || !env.RESTORE_TEST_CLIENT_EMAIL || !env.RESTORE_TEST_PRIVATE_KEY || !process.argv.includes(`--project=${project}`) || !process.argv.includes(`--bucket=${bucketName}`)) throw new Error("Isolated targets required");
  app = initializeApp({ credential: cert({ projectId: project, clientEmail: env.RESTORE_TEST_CLIENT_EMAIL, privateKey: env.RESTORE_TEST_PRIVATE_KEY.replace(/\\n/g, "\n") }) }, "isolated-restore-check");
  const db = getFirestore(app), bucket = getStorage(app).bucket(bucketName), runId = randomUUID();
  const document = db.collection("isolatedRestoreChecks").doc(runId);
  const prefix = `restore-verification/${runId}/`, original = bucket.file(prefix + "original.bin"), backup = bucket.file(prefix + "backup.bin");
  const record = { synthetic: true, public: { summary: "Synthetic repair", area: "Synthetic court" }, private: { reporterUid: "synthetic-resident", landmark: "Synthetic landmark" }, evidencePath: original.name };
  // All deletes are exact resources created by this run in a separately pinned
  // test project/bucket. Existing records and live buckets are never targets.
  try {
    await document.create(record); await original.save(Buffer.from("synthetic-evidence"), { resumable: false, preconditionOpts: { ifGenerationMatch: 0 } });
    const snapshot = (await document.get()).data(); await original.copy(backup);
    await document.delete(); await original.delete();
    await document.create(snapshot); await backup.copy(original);
    assert.deepEqual((await document.get()).data(), record);
    assert.equal((await original.download())[0].toString(), "synthetic-evidence");
    console.log(JSON.stringify({ operation: "isolated-restore", recordRestored: true, evidenceRestored: true, syntheticOnly: true }));
  } finally {
    await document.delete(); await original.delete({ ignoreNotFound: true }); await backup.delete({ ignoreNotFound: true });
  }
} catch { console.log(JSON.stringify({ operation: "isolated-restore", status: "unavailable", code: "CHECK_ISOLATED_TARGET_AND_CONFIGURATION" })); process.exitCode = 1; }
finally { if (app) await deleteApp(app); }
