import { createMemoryModerationStore, createModerationModule, type ModerationReport } from "./moderation-module";
import { defaultPilotOperations } from "@/features/admin/pilot-operations";
const actor = { uid: "primary", roles: ["Administrator"] as const };
const report: ModerationReport = { reference: "AS-REVIEW", reporterUid: "resident", category: "streetlights", description: "Private concern", nearbyLandmark: "Private landmark", evidence: [], status: "Submitted", submittedAt: "2026-10-30T15:59:00Z", public: { summary: "Safe summary", area: "Court", media: [] }, followers: [], affectedResidents: [], supportingEvidence: [], history: [] };
const operations = { ...defaultPilotOperations, primaryUid: "primary", backupUid: "backup", backupAffirmed: true, reviewCalendar: { from: "2026-10-01", through: "2026-12-31", holidays: ["2026-11-02"], source: "Synthetic owner-confirmed fixture", ownerConfirmed: true } };
it.each(["wrong-backup", "unaffirmed", "early", "stale", "unsafe-update"])("refuses %s takeover without a delay notification or history mutation", async scenario => {
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report] }), now: () => new Date(scenario === "early" ? "2026-11-04T11:00:00Z" : "2026-11-04T11:00:01Z"), operations: async () => ({ ...operations, backupAffirmed: scenario !== "unaffirmed" }) });
  await expect(moderation.takeOverReview({ uid: scenario === "wrong-backup" ? "someone-else" : "backup", roles: ["Coordinator"] }, { reference: report.reference, expectedRevision: 0, expectedOperatingRevision: scenario === "stale" ? 99 : 0, operationId: "refused", privacyReviewed: true, update: { en: scenario === "unsafe-update" ? "Contact alice@example.test" : "Review delayed; no repair date promised.", fil: "Naantala ang review; wala pang petsa ng pagkukumpuni." } })).rejects.toBeInstanceOf(Error);
  expect((await moderation.getPrivateReport(actor, report.reference)).history).toHaveLength(0);
  expect(await moderation.listNotifications("resident")).toHaveLength(0);
});
it.each([
  ["2026-10-12T15:59:00Z", "2026-10-14T11:00:00.000Z"],
  ["2026-10-12T16:00:00Z", "2026-10-15T11:00:00.000Z"],
  ["2026-10-16T12:00:00Z", "2026-10-20T11:00:00.000Z"],
  ["2026-10-31T12:00:00Z", "2026-11-04T11:00:00.000Z"],
  ["2026-12-31T01:00:00Z", null],
])("shows the owner-approved target for submission %s without extrapolating an unverified period", async (submittedAt, dueAt) => {
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [{ ...report, submittedAt }] }), operations: async () => operations });
  expect((await moderation.listWorkspace(actor))[0].reviewExpectation?.dueAt).toBe(dueAt);
});
it("does not claim due or overdue work from an unconfirmed calendar", async () => {
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report] }), operations: async () => ({ ...operations, reviewCalendar: { ...operations.reviewCalendar, ownerConfirmed: false } }) });
  expect((await moderation.listWorkspace(actor))[0].reviewExpectation).toMatchObject({ dueAt: null, overdue: false });
});
it("records external forwarding and responses privately without advancing report acceptance or resolution", async () => {
  const seed = { ...report, status: "Under review" as const, approved: true };
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [seed] }) });
  await moderation.recordExternalFollowUp(actor, { reference: report.reference, expectedRevision: 0, operationId: "external-1", phase: "forwarded", organization: "Outside utility", correspondence: "Private contact alice@example.test, Block 9 Lot 12" });
  await moderation.recordExternalFollowUp(actor, { reference: report.reference, expectedRevision: 1, operationId: "external-2", phase: "acknowledged", organization: "Outside utility", correspondence: "Private acknowledgement only; no repair acceptance." });
  expect(await moderation.getPrivateReport(actor, report.reference)).toMatchObject({ status: "Under review", externalFollowUp: [expect.objectContaining({ phase: "forwarded" }), expect.objectContaining({ phase: "acknowledged" })] });
  expect(JSON.stringify(await moderation.getPublicReport(report.reference))).not.toMatch(/alice|Block 9|Outside utility|correspondence/);
  expect(await moderation.listNotifications("resident")).toHaveLength(0);
});
it("records actual acknowledgement and next step without inventing acceptance or repair", async () => {
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report] }), now: () => new Date("2026-11-03T11:00:00Z"), operations: async () => operations });
  const input = { reference: report.reference, expectedRevision: 0, operationId: "ack-1", nextStep: "Check private evidence and decide the appropriate pilot desk." };
  await moderation.acknowledgeReview(actor, input);
  await moderation.acknowledgeReview(actor, input);
  expect(await moderation.getPrivateReport(actor, report.reference)).toMatchObject({ status: "Submitted", review: { acknowledgedAt: "2026-11-03T11:00:00.000Z", nextStep: input.nextStep, actorUid: "primary" } });
  expect((await moderation.listWorkspace(actor))[0].reviewExpectation).toMatchObject({ acknowledged: true, overdue: false });
});
it("persists backup takeover and one honest delay notification across concurrent actions and retries", async () => {
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report] }), now: () => new Date("2026-11-04T11:00:01Z"), operations: async () => operations });
  const backup = { uid: "backup", roles: ["Coordinator"] as const };
  const input = { reference: report.reference, expectedRevision: 0, expectedOperatingRevision: 0, operationId: "takeover-1", privacyReviewed: true, update: { en: "Review is delayed. The backup is now checking the next step; no repair date is confirmed.", fil: "Naantala ang pagsusuri. Sinusuri ng backup ang susunod na hakbang; wala pang petsa ng pagkukumpuni." } };
  await Promise.allSettled([moderation.takeOverReview(backup, input), moderation.takeOverReview(backup, input)]);
  await moderation.takeOverReview(backup, input);
  expect(await moderation.getPrivateReport(actor, report.reference)).toMatchObject({ reviewOwnerUid: "backup", history: [expect.objectContaining({ action: "review-takeover" })], status: "Submitted" });
  expect(await moderation.listNotifications("resident")).toHaveLength(1);
});
it("shows a holiday-aware two-business-day review target through the authorized workspace, not a repair deadline", async () => {
  const operations = { ...defaultPilotOperations, primaryUid: "primary", backupUid: "backup", backupAffirmed: true,
    reviewCalendar: { from: "2026-10-01", through: "2026-12-31", holidays: ["2026-11-02"], source: "Synthetic owner-confirmed fixture", ownerConfirmed: true } };
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report] }), now: () => new Date("2026-11-04T11:00:01Z"), operations: async () => operations });
  expect(await moderation.listWorkspace(actor)).toEqual([expect.objectContaining({ reviewExpectation: { dueAt: "2026-11-04T11:00:00.000Z", overdue: true, acknowledged: false, operatingRevision: 0 } })]);
});
