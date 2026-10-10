import { loadEnvConfig } from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Read-only by default. Scheduling and production execution require operator setup.
loadEnvConfig(process.cwd());
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
if (
  !projectId ||
  !bucketName ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
)
  throw new Error(
    "Configure the Firebase project, private bucket, and server credentials first.",
  );
const apply = process.argv.includes("--apply");
if (
  apply &&
  (!process.argv.includes(`--project=${projectId}`) ||
    !process.argv.includes(`--bucket=${bucketName}`))
)
  throw new Error(
    "Deletion requires explicit matching --project and --bucket targets.",
  );
const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app),
  bucket = getStorage(app).bucket(bucketName);
const cutoff = Date.now() - 86_400_000;
const ownedPath = /^private-evidence\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/;
let expired = 0,
  orphans = 0,
  deleted = 0;
const records = await db.collection("evidenceUploads").get();
for (const doc of records.docs) {
  const record = doc.data();
  if (
    record.attachedTo ||
    !ownedPath.test(record.path ?? "") ||
    Date.parse(record.createdAt) > cutoff ||
    !Number.isFinite(Date.parse(record.createdAt))
  )
    continue;
  expired++;
  if (!apply) continue;
  const path = await db.runTransaction(async (transaction) => {
    const current = (await transaction.get(doc.ref)).data();
    if (
      !current ||
      current.attachedTo ||
      Date.parse(current.createdAt) > cutoff ||
      !ownedPath.test(current.path ?? "")
    )
      return null;
    transaction.update(doc.ref, { deleted: true });
    return current.path;
  });
  if (path) {
    await bucket.file(path).delete({ ignoreNotFound: true });
    deleted++;
  }
}
// Storage writes precede metadata commits. Sweep abandoned crash-window files,
// but re-check metadata at deletion time and never delete attached evidence.
let pageToken;
do {
  const [files, next] = await bucket.getFiles({
    prefix: "private-evidence/",
    autoPaginate: false,
    maxResults: 500,
    pageToken,
  });
  for (const file of files) {
    if (!ownedPath.test(file.name)) continue;
    const [metadata] = await file.getMetadata();
    if (!metadata.timeCreated || Date.parse(metadata.timeCreated) > cutoff)
      continue;
    const matches = await db
      .collection("evidenceUploads")
      .where("path", "==", file.name)
      .get();
    if (
      matches.docs.some((doc) => !doc.data().deleted || doc.data().attachedTo)
    )
      continue;
    orphans++;
    if (apply) {
      await file.delete({
        ignoreNotFound: true,
        ifGenerationMatch: metadata.generation,
      });
      deleted++;
    }
  }
  pageToken = next?.pageToken;
} while (pageToken);
console.log(
  JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    expiredRecords: expired,
    orphanFiles: orphans,
    deletedFiles: deleted,
  }),
);
