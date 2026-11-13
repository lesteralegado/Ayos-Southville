import { createHash, randomUUID } from "node:crypto";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
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
import { archiveRequestedReport, changeResidentReport } from "@/features/reports/resident-report-actions";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";

const run = randomUUID().replaceAll("-", "");
const uid = `contracts-${run}`;
const actor = { uid, roles: ["Administrator"] as const };
const databaseId = `contracts-${run}`;
let app: App;
let db: Firestore;
let auth: Auth;
const ownedStoragePaths: string[] = [];
const ownedOtherUsers: string[] = [];
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
  process.env.FIREBASE_STORAGE_BUCKET = `${localEmulatorProject}.appspot.com`;
  app = initializeApp({ projectId: localEmulatorProject });
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
    if (app) for (const path of ownedStoragePaths) await getStorage(app).bucket(process.env.FIREBASE_STORAGE_BUCKET).file(path).delete({ ignoreNotFound: true });
    if (db && db.databaseId === databaseId && databaseId === `contracts-${run}`) {
      for (const collection of await db.listCollections()) {
        for (const doc of (await collection.get()).docs) await doc.ref.delete();
      }
    }
    if (auth) await auth.deleteUser(uid);
    if (auth) for (const otherUid of ownedOtherUsers) await auth.deleteUser(otherUid);
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

it("archives a report atomically with real SDK retries and retains the owner's private record", async () => {
  const reports = await getReportModule(), moderation = getModerationModule();
  const archiveUid = `${uid}-archive`;
  await auth.createUser({ uid: archiveUid, email: `${archiveUid}@example.test`, emailVerified: true });
  ownedOtherUsers.push(archiveUid);
  await db.collection("residentProfiles").doc(archiveUid).set({ roles: ["Resident"], pilotAccess: "approved" });
  await db.collection("pilotConsents").doc(archiveUid).set({ ...(await db.collection("pilotConsents").doc(uid).get()).data(), residentUid: archiveUid });
  const { reference } = await reports.submit({ ...submission(), residentUid: archiveUid });
  await moderation.accept(actor, acceptance(reference));
  await changeResidentReport(archiveUid, reference, "request-archive");
  await Promise.all([archiveRequestedReport(actor, reference, "Synthetic archive request."), archiveRequestedReport(actor, reference, "Synthetic archive request.")]);
  expect(await reports.getPublic(reference)).toBeNull();
  expect(await reports.getMine(archiveUid, reference)).toMatchObject({ archivedAt: expect.any(String), description: "SYNTHETIC CONTRACT TEST: private reporting details." });
  const report = await moderation.getPrivateReport(actor, reference);
  expect(report.history.filter(event => event.action === "archived")).toHaveLength(1);
  await expect(moderation.transition(actor, { reference, expectedRevision: report.revision, to: "In progress", update: { en: "Must stay private.", fil: "" } })).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await db.collection("residentNotifications").where("reference", "==", reference).get()).docs.filter(doc => doc.data().message.includes("archived"))).toHaveLength(1);
});

it("completes the real-SDK journey through private dispute and confirmation", async () => {
  const reports = await getReportModule(), moderation = getModerationModule(), engagement = getEngagementModule();
  await engagement.setPreferences(uid, { emailEnabled: true, statusUpdates: true, followUpdates: true });
  const receipt = await reports.submit(submission()), reference = receipt.reference;
  await moderation.accept(actor, acceptance(reference));
  const followerUid = `${uid}-follower`;
  await auth.createUser({ uid: followerUid, emailVerified: true }); ownedOtherUsers.push(followerUid);
  await db.collection("residentProfiles").doc(followerUid).set({ roles: ["Resident"], pilotAccess: "approved" });
  await db.collection("pilotConsents").doc(followerUid).set({ id: randomUUID(), residentUid: followerUid, version: consentVersion, consentedAt: new Date().toISOString(), adultAcknowledged: true, locale: "en" });
  await engagement.setUpdates({ residentUid: followerUid, reference, active: true });
  await moderation.transition(actor, { reference, expectedRevision: 1, to: "In progress", update: { en: "Synthetic work started.", fil: "" } });
  async function resolve(revision: number) {
    const id = createHash("sha256").update(`${run}:${revision}`).digest("hex"), path = `contracts/${run}/${id}.jpg`;
    ownedStoragePaths.push(path);
    await getStorage(app).bucket(process.env.FIREBASE_STORAGE_BUCKET).file(path).save(Buffer.from("Synthetic protected test evidence"), { contentType: "image/jpeg" });
    const evidence = { id, name: "synthetic.jpg", type: "image/jpeg" as const, size: 33, visibility: "restricted" as const };
    await db.collection("evidenceUploads").doc(id).set({ ...evidence, path, residentUid: uid, draftKey: `resolution_${reference}`, slotId: `contract_${revision}`, createdAt: new Date().toISOString() });
    await moderation.transition(actor, { reference, expectedRevision: revision, to: "Resolved", update: { en: "", fil: "Synthetic na gawaing natapos." }, resolutionEvidence: [evidence] });
  }
  await resolve(2);
  expect((await engagement.listNotifications(followerUid)).filter(notice => notice.reference === reference)).toHaveLength(2);
  await engagement.setAffected({ residentUid: followerUid, reference, active: true, evidence: [] });
  await engagement.setUpdates({ residentUid: followerUid, reference, active: false });
  expect(await engagement.getResidentState(followerUid, reference)).toMatchObject({ affected: false, following: false });
  expect(await reports.getMine(uid, reference)).toMatchObject({ status: "Resolved" });
  expect((await engagement.listNotifications(uid)).some(notice => notice.reference === reference && notice.update?.fil === "Synthetic na gawaing natapos.")).toBe(true);
  await moderation.respondToResolution(actor, { reference, expectedRevision: 3, response: "dispute", reason: "SYNTHETIC private explanation at my gate." });
  expect(await moderation.getPrivateReport(actor, reference)).toMatchObject({ status: "Under review", history: expect.arrayContaining([expect.objectContaining({ reason: "SYNTHETIC private explanation at my gate." })]) });
  await expect(moderation.respondToResolution(actor, { reference, expectedRevision: 3, response: "dispute", reason: "Duplicate stale request." })).rejects.toMatchObject({ code: "CONFLICT" });
  await moderation.transition(actor, { reference, expectedRevision: 4, to: "In progress", update: { en: "Synthetic follow-up.", fil: "" } });
  await resolve(5);
  await moderation.respondToResolution(actor, { reference, expectedRevision: 6, response: "confirm", reason: "Synthetic check passed." });
  expect(await reports.getMine(uid, reference)).toMatchObject({ status: "Resident confirmed" });
  const published = await reports.getPublic(reference);
  expect(published).toMatchObject({ status: "Resident confirmed", revision: 7 });
  expect(JSON.stringify(published)).not.toMatch(/private explanation|reviewOwnerUid|reporterUid|private reporting details/);
  expect((await db.collection("lifecycleEmailJobs").where("reference", "==", reference).get()).size).toBe(7);
  expect((await engagement.listNotifications(followerUid)).filter(notice => notice.reference === reference && notice.kind === "report-update")).toHaveLength(2);
});

it("publishes with ownership and starts work without assignment using the real transaction and queue", async () => {
  const reports = await getReportModule(), moderation = getModerationModule();
  const receipt = await reports.submit(submission());
  await moderation.accept(actor, acceptance(receipt.reference));
  expect(await moderation.getPrivateReport(actor, receipt.reference)).toMatchObject({ reviewOwnerUid: uid, status: "Under review", revision: 1, review: { actorUid: uid } });
  const owned = await moderation.listWorkspacePage(actor, { filter: "working", ownedFirst: true });
  expect(owned.reports.some(report => report.reference === receipt.reference && report.reviewOwnerUid === uid)).toBe(true);
  await moderation.transition(actor, { reference: receipt.reference, expectedRevision: 1, to: "In progress", update: { en: "Synthetic work started.", fil: "Nagsimula ang synthetic na gawain." } });
  expect(await reports.getMine(uid, receipt.reference)).toMatchObject({ status: "In progress" });
  const published = await reports.getPublic(receipt.reference);
  expect(published).toMatchObject({ status: "In progress" });
  expect(JSON.stringify(published)).not.toContain("reviewOwnerUid");
});

it("withdraws atomically on the real SDK, preserves receipt deduplication, and pages private updates", async () => {
  const reports = await getReportModule(), input = submission();
  const receipt = await reports.submit(input);
  await Promise.all([changeResidentReport(uid, receipt.reference, "withdraw"), changeResidentReport(uid, receipt.reference, "withdraw")]);
  expect(await reports.getMine(uid, receipt.reference)).toBeNull();
  expect(await reports.submit(input)).toEqual({ ...receipt, created: false, withdrawn: true });
  expect(await reports.getMine(uid, receipt.reference)).toBeNull();
  const engagement = getEngagementModule();
  for (let index = 0; index < 25; index++) await engagement.recordReportEvent(uid, `AS-UPDATE${index}`, "Synthetic private update");
  const first = await engagement.listNotificationsPage(uid);
  expect(first.notifications.length).toBe(20);
  const second = await engagement.listNotificationsPage(uid, first.nextCursor);
  expect(second.notifications.length).toBeGreaterThan(0);
  expect(new Set([...first.notifications, ...second.notifications].map(notice => notice.id)).size).toBe(first.notifications.length + second.notifications.length);
});

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

it("traverses tied-date history and sparse overdue windows against real bounded Firestore queries", async () => {
  const reports = await getReportModule(), moderation = getModerationModule();
  const submittedAt = new Date(Date.now() - 10 * 86_400_000).toISOString();
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const through = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const batch = db.batch();
  // Existing contracts in this owned database are acknowledged so they cannot
  // accidentally make the first sparse overdue scan window non-empty.
  for (const doc of (await db.collection("privateReports").get()).docs) {
    batch.set(db.collection("moderationReports").doc(doc.id), { review: { acknowledgedAt: new Date().toISOString() } }, { merge: true });
  }
  for (let index = 0; index < 121; index++) {
    const reference = `AS-ZPAGE${String(index).padStart(6, "0")}`;
    batch.create(db.collection("privateReports").doc(reference), {
      reference, reporterUid: uid, category: "streetlights", description: "SYNTHETIC private page concern", nearbyLandmark: "Synthetic court", status: "Submitted", submittedAt,
      evidence: index < 25 ? [{ id: "a".repeat(64), name: "synthetic.jpg", type: "image/jpeg", size: 50, visibility: "restricted" }] : [],
    });
    if (index >= 21) batch.create(db.collection("moderationReports").doc(reference), { revision: 0, review: { acknowledgedAt: submittedAt, nextStep: "Synthetic private review", actorUid: uid } });
  }
  batch.set(db.collection("pilotOperations").doc("current"), { reviewCalendar: { from, through, holidays: [], source: "Synthetic contract calendar", ownerConfirmed: true } });
  await batch.commit();
  let cursor: string | null = null;
  const seen: string[] = [];
  do {
    const page = await reports.listMinePage(uid, cursor);
    expect(page.reports.length).toBeLessThanOrEqual(20);
    seen.push(...page.reports.map(report => report.reference)); cursor = page.nextCursor;
  } while (cursor);
  const paged = seen.filter(reference => reference.startsWith("AS-ZPAGE"));
  expect(paged).toHaveLength(121); expect(new Set(seen).size).toBe(seen.length);
  expect(paged[0]).toBe("AS-ZPAGE000120"); expect(paged.at(-1)).toBe("AS-ZPAGE000000");
  expect(await reports.getMine(uid, "AS-ZPAGE000000")).toMatchObject({ description: "SYNTHETIC private page concern", evidence: [{ name: "synthetic.jpg" }] });
  expect(await reports.getMine("not-the-owner", "AS-ZPAGE000000")).toBeNull();
  const overdue: string[] = [];
  const first = await moderation.listWorkspacePage(actor, { filter: "overdue" });
  expect(first.reports).toEqual([]); expect(first.nextCursor).not.toBeNull();
  cursor = first.nextCursor;
  do {
    const page = await moderation.listWorkspacePage(actor, { filter: "overdue", cursor });
    expect(JSON.stringify(page.reports)).not.toMatch(/private page concern|evidence|reporterUid|nextStep/);
    overdue.push(...page.reports.map(report => report.reference)); cursor = page.nextCursor;
  } while (cursor);
  expect(overdue).toHaveLength(21); expect(new Set(overdue).size).toBe(21);
  await expect(moderation.listWorkspacePage(actor, { filter: "all", cursor: first.nextCursor })).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(reports.listMinePage("other-owner", (await reports.listMinePage(uid)).nextCursor)).rejects.toMatchObject({ code: "VALIDATION" });
});
