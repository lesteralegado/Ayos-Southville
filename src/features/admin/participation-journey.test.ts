// @vitest-environment node
import { beforeEach, vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), files: new Set<string>(), uid: "resident", verified: true, signedIn: true, revokeOnReceiptRead: false, removeConsentOnSave: false }));
vi.mock("firebase-admin/storage", () => ({ getStorage: () => ({ bucket: () => ({ file: (path: string) => ({
  exists: async () => [fixture.files.has(path)], download: async () => [Buffer.from([1])],
  save: async () => { fixture.files.add(path); if (fixture.removeConsentOnSave) fixture.records.delete("pilotConsents/resident"); },
  delete: async () => { fixture.files.delete(path); },
}) }) }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => fixture.signedIn ? { value: "isolated-session" } : undefined }) }));
vi.mock("@/lib/firebase/admin", async () => {
  const { firebaseBoundary } = await import("@/test/firebase-boundary");
  const db = firebaseBoundary(fixture.records);
  const collection = db.collection.bind(db);
  db.collection = ((name: string) => {
    const value = collection(name);
    if (name !== "submissionReceipts") return value;
    const doc = value.doc.bind(value);
    value.doc = ((id: string) => {
      const ref = doc(id), get = ref.get.bind(ref);
      ref.get = async () => {
        if (fixture.revokeOnReceiptRead) {
          fixture.records.set("residentProfiles/resident", { roles: ["Resident"], pilotAccess: "revoked" });
          fixture.revokeOnReceiptRead = false;
        }
        return get();
      };
      return ref;
    }) as typeof value.doc;
    return value;
  }) as typeof db.collection;
  return { getFirebaseAdmin: () => ({ db, auth: {
    verifySessionCookie: async () => ({ uid: fixture.uid, email: "synthetic@example.test", email_verified: fixture.verified }),
    getUser: async (uid: string) => ({ uid, email: "synthetic@example.test", emailVerified: fixture.verified, disabled: false }),
  } }) };
});
import { POST as submit, GET as mine } from "@/app/api/reports/route";
import { GET as consentStatus, POST as accept } from "@/app/api/participation/route";
import { getReportModule } from "@/features/reports/firebase-report-store";
import { getEvidenceModule } from "@/features/reports/firebase-evidence-store";
import sharp from "sharp";
import { POST as requestDeletion } from "@/app/api/privacy/route";
import { PATCH as processReport } from "@/app/api/moderation/route";
import { getEngagementModule } from "@/features/reports/firebase-engagement-store";
const choice = { version: "southville-adult-pilot-2026-10-12", adultAcknowledged: true, consent: true, locale: "en" };
const report = { idempotencyKey: "synthetic-draft-123456", category: "streetlights", description: "Synthetic streetlight concern for an isolated consent test.", nearbyLandmark: "Synthetic court", isEmergency: false, confirmNonEmergency: true, confirmPublicSummary: true, evidence: [] };
function request(path: string, body: unknown, origin = "https://isolated.test") {
  return new Request("https://isolated.test/api/" + path, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  fixture.records.clear(); fixture.files.clear(); fixture.uid = "resident"; fixture.verified = true; fixture.signedIn = true; fixture.revokeOnReceiptRead = false; fixture.removeConsentOnSave = false;
  fixture.records.set("residentProfiles/resident", { roles: ["Resident"], pilotAccess: "approved" });
  process.env.AUDIT_PSEUDONYM_SECRET = "isolated-consent-audit-key-00000000000000";
  process.env.FIREBASE_STORAGE_BUCKET = "isolated-consent-test";
});
it("confirms a private consent receipt before real submission and recovers the same receipt on retry", async () => {
  expect((await submit(request("reports", report))).status).toBe(403);
  const accepted = await accept(request("participation", { ...choice, residentUid: "other-person" }));
  expect(accepted.status).toBe(200);
  expect(accepted.headers.get("cache-control")).toBe("private, no-store");
  const receipt = (await accepted.json()).receipt;
  expect(receipt).toMatchObject({ version: choice.version, adultAcknowledged: true });
  expect(JSON.stringify(receipt)).not.toContain("resident");
  expect((await (await accept(request("participation", choice))).json()).receipt).toEqual(receipt);
  expect((await (await consentStatus()).json()).receipt).toEqual(receipt);
  expect((await submit(request("reports", report))).status).toBe(201);
  expect((await (await mine()).json()).reports).toHaveLength(1);
});
it("refuses an in-flight submission whose access was revoked after the initial checks", async () => {
  await accept(request("participation", choice));
  fixture.revokeOnReceiptRead = true;
  const response = await submit(request("reports", report));
  expect(response.status).toBe(403);
  expect((await response.json()).code).toBe("PILOT_ACCESS_REQUIRED");
  expect(await (await getReportModule()).listMine("resident")).toEqual([]);
});
it("refuses non-consented private intake photos even through a direct evidence request", async () => {
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).jpeg().toBuffer();
  await expect(getEvidenceModule().upload({ residentUid: "resident", draftKey: "synthetic-draft-123456", slotId: "photo-slot-123456", bytes, type: "image/jpeg" })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  expect(await getEvidenceModule().list("resident", "synthetic-draft-123456")).toEqual([]);
});
it.each(["signed-out", "unverified", "unapproved", "cross-origin", "not-adult", "not-affirmed", "old-disclosure"])("refuses %s enrollment without creating a participation receipt", async scenario => {
  if (scenario === "signed-out") fixture.signedIn = false;
  if (scenario === "unverified") fixture.verified = false;
  if (scenario === "unapproved") fixture.records.set("residentProfiles/resident", { roles: ["Resident"] });
  const input = { ...choice, ...(scenario === "not-adult" ? { adultAcknowledged: false } : {}), ...(scenario === "not-affirmed" ? { consent: false } : {}), ...(scenario === "old-disclosure" ? { version: "old" } : {}) };
  const response = await accept(request("participation", input, scenario === "cross-origin" ? "https://other.test" : undefined));
  expect(response.status).toBe(["signed-out", "unverified"].includes(scenario) ? 401 : ["not-adult", "not-affirmed"].includes(scenario) ? 422 : scenario === "old-disclosure" ? 409 : 403);
  fixture.signedIn = true; fixture.verified = true;
  expect((await (await consentStatus()).json()).receipt).toBeNull();
});
it("keeps private report history and deletion available without participation consent", async () => {
  expect((await mine()).status).toBe(200);
  const response = await requestDeletion(request("privacy", { confirmed: true }));
  expect(response.status).toBe(200);
  expect((await response.json()).request.status).toBe("requested");
  expect((await (await consentStatus()).json()).receipt).toBeNull();
});
it("withholds a consent receipt after the pilot-record retention deadline even before cleanup runs", async () => {
  await accept(request("participation", choice));
  fixture.records.set("pilotOperations/current", { pilotEndedAt: "2020-01-01T00:00:00Z", recordsExpireAt: "2020-03-31T00:00:00Z" });
  expect((await (await consentStatus()).json()).receipt).toBeNull();
});
it("removes a raced photo when consent is no longer current at commit time", async () => {
  await accept(request("participation", choice));
  fixture.removeConsentOnSave = true;
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).jpeg().toBuffer();
  await expect(getEvidenceModule().upload({ residentUid: "resident", draftKey: "synthetic-draft-123456", slotId: "photo-slot-123456", bytes, type: "image/jpeg" })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  expect(await getEvidenceModule().list("resident", "synthetic-draft-123456")).toEqual([]);
  expect(fixture.files.size).toBe(0);
});
it("refuses non-consented report engagement before any private participation mutation", async () => {
  await expect(getEngagementModule().setFollow({ residentUid: "resident", reference: "AS-SYNTHETIC", active: true })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  expect(await getEngagementModule().getResidentState("resident", "AS-SYNTHETIC")).toMatchObject({ following: false });
});
it("completes the consented resident-to-operator-to-resident lifecycle without treating operator duties as enrollment", async () => {
  await accept(request("participation", choice));
  const reference = (await (await submit(request("reports", report))).json()).reference;
  fixture.records.set("residentProfiles/operator", { roles: ["Administrator"] });
  fixture.uid = "operator";
  const change = (action: string, input: object) => processReport(new Request("https://isolated.test/api/moderation", { method: "PATCH", headers: { origin: "https://isolated.test", "content-type": "application/json" }, body: JSON.stringify({ action, input }) }));
  expect((await change("accept", { reference, expectedRevision: 0, publicSummary: "Synthetic streetlight concern.", publicArea: "Synthetic court", approvedMedia: [], reason: "Synthetic privacy review." })).status).toBe(200);
  expect((await change("assign", { reference, expectedRevision: 1, priority: "high", destination: "lighting", reason: "Synthetic follow-up.", update: { en: "Assigned for review.", fil: "Itinalaga para sa review." } })).status).toBe(200);
  expect((await change("transition", { reference, expectedRevision: 2, to: "In progress", update: { en: "Synthetic exercise started.", fil: "Nagsimula ang synthetic na pagsubok." } })).status).toBe(200);
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).jpeg().toBuffer();
  const asset = await getEvidenceModule().upload({ residentUid: "operator", draftKey: "resolution_" + reference, slotId: "resolution-slot-123456", bytes, type: "image/jpeg" });
  expect((await change("transition", { reference, expectedRevision: 3, to: "Resolved", resolutionEvidence: [asset], update: { en: "Synthetic resolution exercise only.", fil: "Synthetic na pagsubok lamang ang resolusyon." } })).status).toBe(200);
  fixture.uid = "resident";
  expect((await change("respond-to-resolution", { reference, expectedRevision: 4, response: "confirm", reason: "Synthetic confirmation." })).status).toBe(200);
  expect((await (await mine()).json()).reports[0].status).toBe("Resident confirmed");
});
