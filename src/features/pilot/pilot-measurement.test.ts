import { createMemoryPilotMeasurementStore, createPilotMeasurement } from "./pilot-measurement";
const admin = { uid: "admin", roles: ["Administrator"] as const };
it("counts failed and assisted attempts in the denominator and never rounds a sub-target result into success", async () => {
  const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore(), { now: () => new Date("2026-10-12T11:00:00Z") });
  await measurement.startTrial(admin, { expectedRevision: 0, releaseApproved: true, prerequisitesReviewed: true, evidenceCode: "EVID-01", startedAt: "2026-10-12T11:00:00Z" });
  for (let index = 0; index < 10; index++) await measurement.record(admin, { participantCode: `P${String(index + 1).padStart(2, "0")}`, source: "real", consentConfirmed: true, submitted: index < 9, assisted: index === 8, understoodStatus: null, foundDuplicate: false, completedLifecycle: false, expectedRevision: 0 });
  expect(await measurement.summary(admin)).toMatchObject({ real: { participants: 10, unassistedSubmissionRate: 80, sampleSufficient: true, submissionTargetMet: true, uncollected: { understoodStatus: 10 }, lifecycleCompletionRate: 0 } });
  await expect(measurement.record(admin, { participantCode: "P11", source: "real", consentConfirmed: true, submitted: true, assisted: false, understoodStatus: true, foundDuplicate: true, completedLifecycle: true, expectedRevision: 0 })).rejects.toMatchObject({ code: "VALIDATION" });
});
it("records weekly decisions and permits expansion only with reviewed coverage, safety and bounded capacity", async () => {
  const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore(), { now: () => new Date("2026-10-19T11:00:00Z") });
  await measurement.startTrial(admin, { expectedRevision: 0, releaseApproved: true, prerequisitesReviewed: true, evidenceCode: "EVID-01", startedAt: "2026-10-12T11:00:00Z" });
  const review = { expectedRevision: 1, week: 1, decision: "expand", capacity: 15, coverageReviewed: true, safetyReviewed: false, evidenceCode: "EVID-WEEK1" };
  await expect(measurement.reviewTrial(admin, review)).rejects.toMatchObject({ code: "VALIDATION" });
  await measurement.reviewTrial(admin, { ...review, safetyReviewed: true });
  expect((await measurement.read(admin)).trial).toMatchObject({ capacity: 15, reviews: [expect.objectContaining({ week: 1, decision: "expand", evidenceCode: "EVID-WEEK1" })] });
  await expect(measurement.reviewTrial(admin, { ...review, expectedRevision: 2, safetyReviewed: true, capacity: 26 })).rejects.toMatchObject({ code: "VALIDATION" });
});
it("requires explicit release approval and start for real findings without ending retention after four weeks", async () => {
  const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore(), { now: () => new Date("2026-10-12T11:00:00Z") });
  const finding = { participantCode: "P01", source: "real", consentConfirmed: true, submitted: false, assisted: true, understoodStatus: null, foundDuplicate: false, completedLifecycle: null, expectedRevision: 0 };
  await expect(measurement.record(admin, finding)).rejects.toMatchObject({ code: "VALIDATION" });
  await measurement.startTrial(admin, { expectedRevision: 0, releaseApproved: true, prerequisitesReviewed: true, evidenceCode: "EVID-01", startedAt: "2026-10-12T11:00:00Z" });
  await measurement.record(admin, finding);
  expect((await measurement.read(admin)).trial).toMatchObject({ startedAt: "2026-10-12T11:00:00.000Z", plannedThrough: "2026-11-09T11:00:00.000Z", capacity: 10 });
  expect(JSON.stringify((await measurement.read(admin)).trial)).not.toMatch(/pilotEndedAt/);
});
it("separates exercises and unknown legacy outcomes and deduplicates edited participants", async () => {
  const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore());
  const input = { participantCode: "P01", source: "exercise", submitted: true, assisted: false, understoodStatus: true, foundDuplicate: null, completedLifecycle: false, expectedRevision: 0 };
  await measurement.record(admin, input);
  await measurement.record(admin, { ...input, submitted: false, expectedRevision: 1 });
  await measurement.record(admin, { ...input, participantCode: "P02", source: "unknown" });
  expect(await measurement.summary(admin)).toMatchObject({ real: { participants: 0 }, exercise: { participants: 1, submissions: 0 }, unknown: { participants: 1 } });
  expect((await measurement.read(admin)).records).toHaveLength(2);
});
it("reports an insufficient real sample rather than success when no findings have been collected", async () => {
  const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore());
  expect(await measurement.summary(admin)).toMatchObject({ real: { participants: 0, unassistedSubmissionRate: null, sampleSufficient: false, submissionTargetMet: false }, exercise: { participants: 0 }, unknown: { participants: 0 } });
});
