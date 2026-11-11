import { createHash, randomUUID } from "node:crypto";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { assertLocalEmulatorServer, localEmulatorHosts, localEmulatorProject } from "@/lib/firebase/local-emulator";
import { defaultPilotConfiguration } from "@/features/admin/administration-module";
import { consentVersion } from "@/features/pilot/participation-consent";

// Only the connection seam is replaced: both persistence adapters and the SDK
// execute unchanged against an owned named database on the real emulator.
const connection = vi.hoisted(() => ({ current: null as { db: Firestore; auth: Auth } | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdmin() {
  if (!connection.current) throw new Error("Isolated emulator connection is not ready.");
  return connection.current;
} }));
import { getReportModule } from "@/features/reports/firebase-report-store";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";

const run = randomUUID().replaceAll("-", "");
const uid = `contracts-${run}`;
const actor = { uid, roles: ["Administrator"] as const };
const databaseId = `contracts-${run}`;
let app: App;
let db: Firestore;
let auth: Auth;
const previousEnvironment = { ...process.env };

beforeAll(async () => {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") throw new Error("Persistence checks are local-only.");
  const response = await fetch("http://127.0.0.1:4400/emulators", { signal: AbortSignal.timeout(5000) });
  expect(response.ok).toBe(true);
  const services = await response.json();
  for (const [name, host] of Object.entries(localEmulatorHosts)) {
    expect(`${services[name]?.host}:${services[name]?.port}`).toBe(host);
  }
  Object.assign(process.env, {
    NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: localEmulatorProject,
    FIREBASE_AUTH_EMULATOR_HOST: localEmulatorHosts.auth,
    FIRESTORE_EMULATOR_HOST: localEmulatorHosts.firestore,
    FIREBASE_STORAGE_EMULATOR_HOST: localEmulatorHosts.storage,
    FIREBASE_STORAGE_BUCKET: `${localEmulatorProject}.appspot.com`,
    AUDIT_PSEUDONYM_SECRET: "synthetic-contract-test-secret-not-production-2026",
    DEMO_MODE: "false",
  });
  expect(assertLocalEmulatorServer(process.env)).toBe(true);
  app = initializeApp({ projectId: localEmulatorProject }, databaseId);
  db = getFirestore(app, databaseId);
  auth = getAuth(app);
  connection.current = { db, auth };
  console.info(`Synthetic persistence contracts: ${localEmulatorProject}/${databaseId}; owned Auth user ${uid}`);
  await auth.createUser({ uid, email: `${uid}@example.test`, emailVerified: true });
  await db.collection("residentProfiles").doc(uid).set({ roles: ["Administrator"], pilotAccess: "approved" });
  await db.collection("pilotConsents").doc(uid).set({ residentUid: uid, id: randomUUID(), version: consentVersion, consentedAt: new Date().toISOString(), adultAcknowledged: true, locale: "en" });
  await db.collection("pilotConfiguration").doc("current").set(defaultPilotConfiguration);
});

afterAll(async () => {
  // Never clear the shared default database, other test databases or accounts.
  try {
    if (db && db.databaseId === databaseId && databaseId === `contracts-${run}`) {
      for (const collection of await db.listCollections()) {
        for (const doc of (await collection.get()).docs) await doc.ref.delete();
      }
    }
    if (auth) await auth.deleteUser(uid);
  } finally {
    if (app) await deleteApp(app);
    connection.current = null;
    for (const key of Object.keys(process.env)) if (!(key in previousEnvironment)) delete process.env[key];
    Object.assign(process.env, previousEnvironment);
  }
});

function submission() {
  return { residentUid: uid, idempotencyKey: randomUUID(), category: "streetlights", description: "SYNTHETIC CONTRACT TEST: private reporting details.", nearbyLandmark: "Synthetic covered court", evidence: [], isEmergency: false, confirmNonEmergency: true, confirmPublicSummary: true };
}
function acceptance(reference: string) {
  return { reference, expectedRevision: 0, publicSummary: "SYNTHETIC CONTRACT TEST: light concern.", publicArea: "Synthetic court", approvedMedia: [], reason: "Synthetic privacy review." };
}

it("concurrent retries return one durable report and submission notification", async () => {
  const reports = await getReportModule(), input = submission();
  const receipts = await Promise.all([reports.submit(input), reports.submit(input)]);
  expect(receipts[0].reference).toBe(receipts[1].reference);
  expect(receipts.filter(receipt => receipt.created)).toHaveLength(1);
  expect(await reports.recover(uid, input.idempotencyKey)).toEqual({ reference: receipts[0].reference, created: false });
  expect((await reports.listMine(uid)).filter(report => report.reference === receipts[0].reference)).toHaveLength(1);
  expect((await getModerationModule().listNotifications(uid)).filter(notice => notice.reference === receipts[0].reference)).toHaveLength(1);
  expect(await reports.getPublic(receipts[0].reference)).toBeNull();
});

it("a late immutable outbox collision rolls back report, notification, public projection and audit writes", async () => {
  const reports = await getReportModule(), moderation = getModerationModule();
  const { reference } = await reports.submit(submission());
  await db.collection("notificationPreferences").doc(uid).set({ emailEnabled: true, statusUpdates: true });
  const jobId = createHash("sha256").update(`${uid}:${reference}:1`, "utf8").digest("hex");
  // Fixture collision fails a create after earlier lifecycle writes are queued.
  // This exercises Firestore commit failure rather than throwing before writes.
  await db.collection("lifecycleEmailJobs").doc(jobId).create({ fixture: "owned collision", reference });
  const auditBefore = await moderation.listAudit(actor);
  await expect(moderation.accept(actor, acceptance(reference))).rejects.toThrow();
  expect(await moderation.getPrivateReport(actor, reference)).toMatchObject({ status: "Submitted", revision: 0 });
  expect((await reports.listMine(uid)).find(report => report.reference === reference)?.status).toBe("Submitted");
  expect(await reports.getPublic(reference)).toBeNull();
  expect((await moderation.listNotifications(uid)).filter(notice => notice.reference === reference)).toHaveLength(1);
  expect(await moderation.listAudit(actor)).toEqual(auditBefore);
  expect((await db.collection("lifecycleEmailJobs").doc(jobId).get()).data()).toEqual({ fixture: "owned collision", reference });
  await db.collection("lifecycleEmailJobs").doc(jobId).delete();
  await moderation.accept(actor, acceptance(reference));
  expect(await moderation.getPrivateReport(actor, reference)).toMatchObject({ status: "Under review", revision: 1 });
  expect((await db.collection("lifecycleEmailJobs").doc(jobId).get()).data()).toMatchObject({ residentUid: uid, reference, status: "pending", attempts: 0 });
});

it("concurrent actions at one revision commit exactly one lifecycle change and outbox job", async () => {
  const reports = await getReportModule(), moderation = getModerationModule();
  const { reference } = await reports.submit(submission());
  await db.collection("notificationPreferences").doc(uid).set({ emailEnabled: true, statusUpdates: true });
  await moderation.accept(actor, acceptance(reference));
  const assign = { reference, expectedRevision: 1, priority: "normal" as const, destination: "lighting", reason: "Synthetic internal desk.", update: { en: "Assigned for a test.", fil: "Itinalaga para sa pagsubok." } };
  const results = await Promise.allSettled([moderation.assign(actor, assign), moderation.assign(actor, assign)]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
  expect(await moderation.getPrivateReport(actor, reference)).toMatchObject({ status: "Assigned", revision: 2 });
  expect((await moderation.listNotifications(uid)).filter(notice => notice.reference === reference)).toHaveLength(3);
  expect((await db.collection("lifecycleEmailJobs").where("reference", "==", reference).get()).docs).toHaveLength(2);
  expect(await reports.getPublic(reference)).toMatchObject({ status: "Assigned" });
  expect(JSON.stringify(await reports.getPublic(reference))).not.toContain("private reporting details");
});
