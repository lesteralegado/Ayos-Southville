// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), files: new Map<string, boolean>(), failStorage: false, users: new Map<string, { uid: string; email: string; disabled?: boolean; emailVerified?: boolean }>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary"); const db = firebaseBoundary(fixture.records);
  return { getFirebaseAdmin: () => ({ db, auth: {
    getUser: async (uid: string) => { const user = fixture.users.get(uid); if (!user) throw { code: "auth/user-not-found" }; return user; },
    updateUser: async (uid: string, value: object) => { const user = fixture.users.get(uid); if (!user) throw { code: "auth/user-not-found" }; Object.assign(user, value); },
    revokeRefreshTokens: async () => undefined,
    deleteUser: async (uid: string) => { fixture.users.delete(uid); },
  } }) };
});
vi.mock("firebase-admin/storage", () => ({ getStorage: () => ({ bucket: () => ({
  getMetadata: async () => [{}], getFiles: async () => [[], {}],
  file: (path: string) => ({ exists: async () => [fixture.files.has(path)], download: async () => [Buffer.from([1])],
    save: async () => { fixture.files.set(path, true); },
    delete: async () => { if (fixture.failStorage) throw new Error("Storage unavailable"); fixture.files.delete(path); } }),
}) }) }));
vi.mock("@/features/admin/firebase-administration-store", async importOriginal => ({ ...await importOriginal<typeof import("@/features/admin/firebase-administration-store")>(), getPublicPilotConfiguration: async () => ({ categories: [{ id: "streetlights", active: true }] }) }));
import { getAdministrationModule } from "@/features/admin/firebase-administration-store";
import { getPrivacyModule } from "./firebase-privacy";
import { runRetention } from "./firebase-retention";
import { POST as retentionPost } from "@/app/api/internal/retention/route";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { getEvidenceModule } from "@/features/reports/firebase-evidence-store";
import { getModerationModule } from "@/features/reports/firebase-moderation-store";
const actor = { uid: "admin", roles: ["Administrator"] as const }, id = "a".repeat(64);
const path = "private-evidence/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";
it("recovers a full draft after its five abandoned uploads expire", async () => {
  const draftKey = "isolated-draft-1234", ids = Array.from({ length: 5 }, (_, index) => String(index).repeat(64));
  const { createHash } = await import("node:crypto");
  const draftId = createHash("sha256").update(JSON.stringify(["resident", draftKey])).digest("hex");
  fixture.records.set("evidenceDrafts/" + draftId, { residentUid: "resident", ids });
  for (const oldId of ids) fixture.records.set("evidenceUploads/" + oldId, { id: oldId, residentUid: "resident", draftKey, createdAt: "2020-01-01T00:00:00Z", path: "", type: "image/jpeg" });
  await runRetention(); await runRetention(true);
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).jpeg().toBuffer();
  const replacement = await getEvidenceModule().upload({ residentUid: "resident", draftKey, slotId: "replacement-slot-1234", bytes, type: "image/jpeg" });
  expect(await getEvidenceModule().list("resident", draftKey)).toMatchObject([{ id: replacement.id }]);
});
it("authenticates the worker and defaults to an explicit non-destructive preview", async () => {
  process.env.RETENTION_WORKER_SECRET = "isolated-worker-secret-000000000000000";
  const unauthorized = await retentionPost(new Request("https://example.test/api/internal/retention", { method: "POST", body: JSON.stringify({ mode: "apply" }) }));
  expect(unauthorized.status).toBe(401);
  const authorized = await retentionPost(new Request("https://example.test/api/internal/retention", { method: "POST", headers: { authorization: `Bearer ${process.env.RETENTION_WORKER_SECRET}` }, body: JSON.stringify({ mode: "dry-run" }) }));
  expect(authorized.status).toBe(200);
  expect(await authorized.json()).toMatchObject({ mode: "dry-run", removed: 0 });
  expect(fixture.users.has("resident")).toBe(true);
});
beforeEach(() => {
  fixture.records.clear(); fixture.files.clear(); fixture.users.clear(); fixture.failStorage = false;
  Object.assign(process.env, { AUDIT_PSEUDONYM_SECRET: "isolated-synthetic-audit-key-000000000", RETENTION_APPLY_ENABLED: "true", RETENTION_TARGET_PROJECT: "isolated-pilot-test", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "isolated-pilot-test", RETENTION_TARGET_BUCKET: "isolated-test-bucket", FIREBASE_STORAGE_BUCKET: "isolated-test-bucket" });
  fixture.records.set("residentProfiles/admin", { roles: ["Administrator"] });
  fixture.records.set("residentProfiles/resident", { roles: ["Resident"], pilotAccess: "approved" });
  fixture.records.set("pilotConsents/resident", { residentUid: "resident", id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T00:00:00Z", adultAcknowledged: true, locale: "en" });
  fixture.users.set("resident", { uid: "resident", email: "synthetic@example.test", emailVerified: true });
  fixture.records.set("privateReports/AS-600001", { reporterUid: "resident", reference: "AS-600001", evidence: [{ id }], status: "Submitted", category: "streetlights", description: "Private household description", submittedAt: "2026-10-10T00:00:00Z" });
  fixture.records.set("evidenceUploads/" + id, { id, residentUid: "resident", attachedTo: "AS-600001", path, createdAt: new Date().toISOString(), type: "image/jpeg", deleted: false });
  fixture.files.set(path, true);
});
it("requires a matching dry-run plan and deletes the approved account journey without private output", async () => {
  fixture.records.set("pilotConsents/resident", { residentUid: "resident", id: "11111111-1111-4111-8111-111111111111", version: "southville-adult-pilot-2026-10-12", consentedAt: "2026-10-12T00:00:00Z", adultAcknowledged: true, locale: "en" });
  expect(await getAdministrationModule().getConsent({ uid: "resident", emailVerified: true })).not.toBeNull();
  const privacy = getPrivacyModule(), request = await privacy.request("resident", true);
  await privacy.decide(actor, request.id, "approved");
  await expect(runRetention(true)).rejects.toMatchObject({ code: "DRY_RUN_REQUIRED" });
  const preview = await runRetention(); expect(preview.deletedAccounts).toBe(1);
  expect(await (await getReportModule()).listMine("resident")).toHaveLength(1);
  const result = await runRetention(true); expect(result.deletedAccounts).toBe(1);
  expect(await (await getReportModule()).listMine("resident")).toEqual([]);
  expect(await getAdministrationModule().getConsent({ uid: "resident", emailVerified: true })).toBeNull();
  await expect(getEvidenceModule().read("resident", id, false)).rejects.toMatchObject({ status: 404 });
  expect((await privacy.list(actor))[0]).toMatchObject({ id: request.id, status: "complete" });
  expect(JSON.stringify(await privacy.list(actor))).not.toContain("residentUid");
  expect(JSON.stringify(await getModerationModule().listAudit(actor))).not.toMatch(/resident|synthetic@example|household/);
  expect(JSON.stringify(result)).not.toMatch(/resident|synthetic@example|private-evidence/);
  await runRetention(); expect((await runRetention(true)).deletedAccounts).toBe(0);
});
it("keeps a failed storage deletion retryable and never marks it complete prematurely", async () => {
  const privacy = getPrivacyModule(), request = await privacy.request("resident", true);
  await privacy.decide(actor, request.id, "approved"); await runRetention(); fixture.failStorage = true;
  await expect(runRetention(true)).rejects.toThrow("Storage unavailable");
  expect((await privacy.mine("resident"))?.status).toBe("approved");
  fixture.failStorage = false; await runRetention(); await runRetention(true);
  expect((await privacy.list(actor))[0].status).toBe("complete");
});
it("blocks destructive mode when independent target pins do not match", async () => {
  process.env.RETENTION_TARGET_PROJECT = "wrong-project";
  await expect(runRetention(true)).rejects.toMatchObject({ code: "CLEANUP_DISABLED" });
});
it("replays the erasure ledger against an isolated restored snapshot before data returns to service", async () => {
  const backup = structuredClone([...fixture.records]);
  const privacy = getPrivacyModule(), request = await privacy.request("resident", true);
  await privacy.decide(actor, request.id, "approved"); await runRetention(); await runRetention(true);
  // The external adapter restores synthetic records; the current ledger is
  // deliberately preserved, as the recovery runbook requires.
  for (const [key, value] of backup) fixture.records.set(key, value);
  fixture.files.set(path, true); fixture.users.set("resident", { uid: "resident", email: "synthetic@example.test" });
  expect(await (await getReportModule()).listMine("resident")).toHaveLength(1);
  expect((await runRetention()).deletedAccounts).toBe(1);
  await runRetention(true);
  expect(await (await getReportModule()).listMine("resident")).toEqual([]);
  await expect(getEvidenceModule().read("resident", id, false)).rejects.toMatchObject({ status: 404 });
});
