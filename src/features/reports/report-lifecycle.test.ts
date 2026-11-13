import { createMemoryModerationStore, createModerationModule, type ModerationReport } from "./moderation-module";

const report = (): ModerationReport => ({
  reference: "AS-LIFE01", reporterUid: "resident-1", category: "roads-drainage", description: "Drainage remains blocked after rain.", nearbyLandmark: "Covered court",
  evidence: [], status: "Under review", submittedAt: "2026-10-10T01:00:00.000Z", public: { summary: "Blocked drainage near the covered court.", area: "Phase 2", media: [] },
  followers: ["resident-2"], affectedResidents: ["resident-3"], supportingEvidence: [],
  history: [{ action: "accepted", status: "Under review", occurredAt: "2026-10-10T02:00:00.000Z", update: { en: "Accepted for review.", fil: "Tinanggap para sa pagsusuri." } }],
});
const moderator = { uid: "moderator-1", roles: ["Moderator"] as const };
const coordinator = { uid: "coordinator-1", roles: ["Coordinator"] as const };
const reporter = { uid: "resident-1", roles: ["Resident"] as const };

describe("report resolution lifecycle", () => {
  it("accepts one authored language without inventing a translation", async () => {
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report()] }) });
    await moderation.transition(coordinator, { reference: "AS-LIFE01", expectedRevision: 0, to: "In progress", update: { en: "Clearing has started.", fil: "" } });
    expect(await moderation.getPublicReport("AS-LIFE01")).toMatchObject({ timeline: expect.arrayContaining([expect.objectContaining({ update: { en: "Clearing has started.", fil: "" } })]) });
    await expect(moderation.transition(coordinator, { reference: "AS-LIFE01", expectedRevision: 1, to: "Resolved", update: { en: "", fil: "" } })).rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("moves an accepted report through resident-confirmed resolution with bilingual public history, notifications, audit, and evidence", async () => {
    const submitted = report();
    submitted.status = "Submitted";
    submitted.history = [{ action: "submitted", status: "Submitted", occurredAt: "2026-10-10T01:00:00.000Z", update: { en: "Report submitted.", fil: "Isinumite ang ulat." } }];
    const store = createMemoryModerationStore({ reports: [submitted] });
    const moderation = createModerationModule({ store, now: (() => { let minute = 3; return () => new Date(`2026-10-10T03:${String(minute++).padStart(2, "0")}:00.000Z`); })() });
    await moderation.accept(moderator, { reference: "AS-LIFE01", publicSummary: "Blocked drainage near the covered court.", publicArea: "Phase 2", approvedMedia: [], reason: "Valid local concern.", update: { en: "Accepted for review.", fil: "Tinanggap para sa pagsusuri." } });
    await moderation.assign(coordinator, { reference: "AS-LIFE01", priority: "high", destination: "Drainage team", reason: "Standing water affects access.", update: { en: "Assigned to the drainage team.", fil: "Itinalaga sa pangkat ng drainage." } });
    await moderation.transition(coordinator, { reference: "AS-LIFE01", to: "In progress", update: { en: "Clearing work has started.", fil: "Nagsimula na ang paglilinis." } });
    await moderation.transition(coordinator, { reference: "AS-LIFE01", to: "Resolved", update: { en: "The drain was cleared and tested.", fil: "Nilinis at sinubukan na ang daluyan." }, resolutionEvidence: [{ id: "resolution-1", name: "cleared-drain.jpg", type: "image/jpeg", size: 12000, visibility: "restricted" }] });
    await moderation.respondToResolution(reporter, { reference: "AS-LIFE01", response: "confirm", reason: "Water now drains normally." });
    expect(await moderation.getPrivateReport(coordinator, "AS-LIFE01")).toMatchObject({ status: "Resident confirmed", resolutionEvidence: [{ id: "resolution-1" }] });
    expect(await moderation.getPublicReport("AS-LIFE01")).toMatchObject({ status: "Resident confirmed", timeline: [expect.objectContaining({ status: "Under review" }), expect.objectContaining({ status: "Assigned" }), expect.objectContaining({ status: "In progress" }), expect.objectContaining({ status: "Resolved" }), expect.objectContaining({ status: "Resident confirmed" })] });
    expect(await moderation.listNotifications("resident-2")).toHaveLength(5);
    expect(await moderation.listAudit({ uid: "admin-1", roles: ["Administrator"] })).toHaveLength(5);
  });

  it("rejects invalid transitions and preserves history and evidence when the reporter disputes resolution", async () => {
    const initial = report(); initial.status = "Assigned";
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [initial] }), now: () => new Date("2026-10-10T06:00:00.000Z") });
    await expect(moderation.transition(coordinator, { reference: "AS-LIFE01", to: "Resolved", update: { en: "Skipped work.", fil: "Nilaktawan ang gawain." }, resolutionEvidence: [{ id: "bad", name: "bad.jpg", type: "image/jpeg", size: 10, visibility: "restricted" }] })).rejects.toMatchObject({ code: "VALIDATION" });
    await moderation.transition(coordinator, { reference: "AS-LIFE01", to: "In progress", update: { en: "Work started.", fil: "Nagsimula ang gawain." } });
    await moderation.transition(coordinator, { reference: "AS-LIFE01", to: "Resolved", update: { en: "Work completed.", fil: "Natapos ang gawain." }, resolutionEvidence: [{ id: "proof", name: "proof.jpg", type: "image/jpeg", size: 10, visibility: "restricted" }] });
    await moderation.respondToResolution(reporter, { reference: "AS-LIFE01", response: "dispute", reason: "Water still pools after rain." });
    expect(await moderation.getPrivateReport(coordinator, "AS-LIFE01")).toMatchObject({ status: "Under review", resolutionEvidence: [{ id: "proof" }], history: expect.arrayContaining([expect.objectContaining({ status: "Resolved" }), expect.objectContaining({ action: "resident-disputed" })]) });
    await expect(moderation.respondToResolution({ uid: "resident-2", roles: ["Resident"] }, { reference: "AS-LIFE01", response: "confirm", reason: "Looks good." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps a successful transition when optional email delivery fails", async () => {
    const initial = report(); initial.status = "Assigned";
    const sendEmail = vi.fn(async () => { throw new Error("mail unavailable"); });
    const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [initial] }), emailEnabled: async (uid) => uid === "resident-1", sendEmail });
    await moderation.transition(coordinator, { reference: "AS-LIFE01", to: "In progress", update: { en: "Work started.", fil: "Nagsimula ang gawain." } });
    expect((await moderation.getPrivateReport(coordinator, "AS-LIFE01")).status).toBe("In progress");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ residentUid: "resident-1", reference: "AS-LIFE01" }));
  });
});
