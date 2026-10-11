import { createMemoryModerationStore, createModerationModule, type ModerationReport } from "./moderation-module";

const submittedReport = (reference = "AS-REVIEW1", reporterUid = "resident-1"): ModerationReport => ({
  reference, reporterUid, category: "streetlights",
  description: "A private description with a resident phone number 09171234567.", nearbyLandmark: "Block 9 Lot 12",
  exactLocation: { latitude: 14.281234, longitude: 121.126789, privateDetails: "Blue gate" },
  evidence: [{ id: "photo-1", name: "home.jpg", type: "image/jpeg", size: 24_000, visibility: "restricted" }],
  status: "Submitted", submittedAt: "2026-10-10T02:00:00.000Z",
  public: { summary: "A streetlight concern was submitted for review.", area: "Southville 1 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Location pending review", media: [] },
  followers: [reporterUid], affectedResidents: [reporterUid], supportingEvidence: [], history: [],
});

const moderator = { uid: "moderator-1", roles: ["Moderator"] as const };
const coordinator = { uid: "coordinator-1", roles: ["Coordinator"] as const };
const resident = { uid: "resident-1", roles: ["Resident"] as const };

describe("report moderation application boundary", () => {
  it("accepts only one concurrent decision and keeps one timeline, notification, and audit set", async () => {
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [submittedReport()] }) });
    const input = { reference: "AS-REVIEW1", expectedRevision: 0, publicSummary: "Broken light near the court.", publicArea: "Court", approvedMedia: [], reason: "Reviewed safely." };
    const decisions = await Promise.allSettled([moderation.accept(moderator, input), moderation.accept(moderator, input)]);
    expect(decisions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(decisions.filter((result) => result.status === "rejected")).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: "CONFLICT" }) })]);
    expect((await moderation.getPrivateReport(moderator, "AS-REVIEW1")).history).toHaveLength(1);
    expect(await moderation.listNotifications("resident-1")).toHaveLength(1);
    expect(await moderation.listAudit({ uid: "admin", roles: ["Administrator"] })).toHaveLength(1);
  });
  it("keeps accepted work in the workspace and rejects stale actions without side effects", async () => {
    const store = createMemoryModerationStore({ reports: [submittedReport()] });
    const moderation = createModerationModule({ store });
    await moderation.accept(moderator, { reference: "AS-REVIEW1", publicSummary: "Broken light near the court.", publicArea: "Covered court", approvedMedia: [], reason: "Private details removed.", expectedRevision: 0 });
    expect(await moderation.listWorkspace(coordinator)).toEqual([expect.objectContaining({ status: "Under review", revision: 1 })]);
    await expect(moderation.assign(coordinator, { reference: "AS-REVIEW1", priority: "high", destination: "lighting", reason: "Dark crossing.", update: { en: "Assigned.", fil: "Itinalaga." }, expectedRevision: 0 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await moderation.getPrivateReport(coordinator, "AS-REVIEW1")).status).toBe("Under review");
    expect(await moderation.listAudit({ uid: "admin", roles: ["Administrator"] })).toHaveLength(1);
  });
  it("allows authorized operators to review private reports while denying residents", async () => {
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [submittedReport()] }) });
    await expect(moderation.listQueue(resident)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(moderation.getPrivateReport(resident, "AS-REVIEW1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await moderation.listQueue(moderator)).toEqual([expect.objectContaining({ reference: "AS-REVIEW1", status: "Submitted" })]);
    expect(await moderation.getPrivateReport(moderator, "AS-REVIEW1")).toMatchObject({ exactLocation: { privateDetails: "Blue gate" }, evidence: [{ id: "photo-1" }] });
  });

  it("publishes only moderator-approved text, approximate location, and media", async () => {
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [submittedReport()] }), now: () => new Date("2026-10-10T03:00:00.000Z") });
    await expect(moderation.accept(resident, { reference: "AS-REVIEW1", publicSummary: "Broken light near the covered court.", publicArea: "Phase 2 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Covered court", publicLocation: { latitude: 14.28, longitude: 121.13 }, approvedMedia: [{ id: "photo-1", alt: "Unlit streetlight" }], reason: "Private details removed." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await moderation.accept(moderator, { reference: "AS-REVIEW1", publicSummary: "Broken light near the covered court.", publicArea: "Phase 2 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Covered court", publicLocation: { latitude: 14.28, longitude: 121.13 }, approvedMedia: [{ id: "photo-1", alt: "Unlit streetlight" }], reason: "Private details removed." });
    const publicReport = await moderation.getPublicReport("AS-REVIEW1");
    expect(publicReport).toMatchObject({ status: "Under review", summary: "Broken light near the covered court.", area: "Phase 2 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Covered court", location: { latitude: 14.28, longitude: 121.13 }, media: [{ id: "photo-1" }] });
    expect(JSON.stringify(publicReport)).not.toMatch(/09171234567|Block 9|Blue gate|home.jpg/i);
  });

  it.each(["spam", "abusive", "emergency", "out-of-area", "out-of-scope"] as const)("rejects %s reports with a resident-readable reason", async (category) => {
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [submittedReport()] }) });
    await moderation.reject(moderator, { reference: "AS-REVIEW1", category, reason: "This report cannot be processed in the community queue." });
    await expect(moderation.getPublicReport("AS-REVIEW1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await moderation.getPrivateReport(moderator, "AS-REVIEW1")).toMatchObject({ status: "Rejected", public: { outcomeReason: "This report cannot be processed in the community queue." } });
  });

  it("merges duplicates without losing residents, evidence, or history and redirects followers", async () => {
    const canonical = submittedReport("AS-CANON", "resident-1");
    canonical.status = "Under review";
    canonical.followers = ["resident-1"]; canonical.affectedResidents = ["resident-1"];
    const duplicate = submittedReport("AS-DUPE", "resident-2");
    duplicate.followers = ["resident-2", "resident-3"]; duplicate.affectedResidents = ["resident-2"];
    duplicate.supportingEvidence = [{ id: "support-1", name: "extra.jpg", type: "image/jpeg", size: 1000, visibility: "restricted" }];
    duplicate.history = [{ action: "submitted", occurredAt: "2026-10-10T02:00:00.000Z" }];
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [canonical, duplicate] }), now: () => new Date("2026-10-10T04:00:00.000Z") });
    await moderation.merge(moderator, { duplicateReference: "AS-DUPE", canonicalReference: "AS-CANON", reason: "Same broken streetlight." });
    expect(await moderation.getPublicReport("AS-DUPE")).toEqual({ reference: "AS-DUPE", status: "Duplicate", canonicalReference: "AS-CANON", outcomeReason: "Same broken streetlight." });
    expect(await moderation.getPrivateReport(moderator, "AS-CANON")).toMatchObject({ followers: ["resident-1", "resident-2", "resident-3"], affectedResidents: ["resident-1", "resident-2"], supportingEvidence: expect.arrayContaining([expect.objectContaining({ id: "support-1" })]), history: expect.arrayContaining([expect.objectContaining({ action: "merged-from:AS-DUPE" })]) });
    expect(await moderation.listNotifications("resident-2")).toEqual([expect.objectContaining({ reference: "AS-CANON", message: expect.stringContaining("AS-CANON") })]);
  });

  it("lets coordinators assign priority and destination but denies moderators", async () => {
    const accepted = submittedReport();
    accepted.status = "Under review";
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [accepted] }) });
    await expect(moderation.assign(moderator, { reference: "AS-REVIEW1", priority: "high", destination: "Southville pilot lighting desk", reason: "Dark pedestrian crossing." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await moderation.assign(coordinator, { reference: "AS-REVIEW1", priority: "high", destination: "Southville pilot lighting desk", reason: "Dark pedestrian crossing." });
    expect(await moderation.getPrivateReport(coordinator, "AS-REVIEW1")).toMatchObject({ status: "Assigned", priority: "high", destination: "Southville pilot lighting desk" });
  });

  it("records actor, time, action, target, and reason in append-only audit history", async () => {
    const store = createMemoryModerationStore({ reports: [submittedReport()] });
    const moderation = createModerationModule({ store, now: () => new Date("2026-10-10T05:00:00.000Z") });
    await moderation.reject(moderator, { reference: "AS-REVIEW1", category: "spam", reason: "Repeated advertising." });
    expect(await moderation.listAudit({ uid: "admin-1", roles: ["Administrator"] })).toEqual([{ actorUid: "moderator-1", occurredAt: "2026-10-10T05:00:00.000Z", action: "report.rejected", target: "AS-REVIEW1", reason: "Repeated advertising." }]);
    const attemptedReplacement = { actorUid: "attacker", occurredAt: "later", action: "tamper", target: "AS-REVIEW1", reason: "replace" };
    await store.appendAudit(attemptedReplacement, "existing-id");
    await expect(store.appendAudit(attemptedReplacement, "existing-id")).rejects.toThrow(/immutable/i);
  });
});
it("notifies the canonical original reporter even when they do not follow their report", async () => {
  const make = (reference: string, reporterUid: string, status: "Submitted" | "Under review"): ModerationReport => ({ reference, reporterUid, status, category: "streetlights", description: "Streetlight concern.", nearbyLandmark: "Court", evidence: [], submittedAt: "2026-10-11T00:00:00Z", public: { summary: "Streetlight concern", area: "Court", media: [] }, followers: [], affectedResidents: [], supportingEvidence: [], history: [] });
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [make("AS-DUP001", "duplicate-reporter", "Submitted"), make("AS-CAN001", "canonical-reporter", "Under review")] }) });
  await moderation.merge({ uid: "operator", roles: ["Moderator"] }, { duplicateReference: "AS-DUP001", canonicalReference: "AS-CAN001", reason: "Same streetlight concern." });
  expect(await moderation.listNotifications("canonical-reporter")).toHaveLength(1);
  expect((await moderation.listNotifications("canonical-reporter"))[0].reference).toBe("AS-CAN001");
  expect(await moderation.listNotifications("duplicate-reporter")).toHaveLength(1);
});
