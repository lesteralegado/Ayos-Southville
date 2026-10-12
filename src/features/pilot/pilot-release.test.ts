import { createPilotRelease, createRepresentativePilotFixture, demoPilotFixture } from "./pilot-release";
import { createMemoryPilotMeasurementStore, createPilotMeasurement } from "./pilot-measurement";

describe("pilot operations boundary", () => {
  it("provides an explicitly labeled, realistic demonstration for at least ten participants", () => {
    const release = createPilotRelease(demoPilotFixture);
    expect(release.mode).toBe("demonstration");
    expect(release.disclosure.en).toMatch(/not an official/i);
    expect(release.participants).toHaveLength(10);
    expect(new Set(release.reports.map((report) => report.status))).toEqual(new Set(["Submitted", "Under review", "Assigned", "In progress", "Resolved", "Resident confirmed"]));
    expect(release.reports.some((report) => report.evidence.length > 0)).toBe(true);
    expect(release.analytics.totalReports).toBe(release.reports.length);
  });

  it("records the pilot outcomes without identities and calculates the unassisted submission rate", () => {
    const release = createPilotRelease({ ...demoPilotFixture, sessions: [
      { participantCode: "P01", submitted: true, assisted: false, understoodStatus: true, foundDuplicate: true, completedLifecycle: true },
      { participantCode: "P02", submitted: true, assisted: true, understoodStatus: false, foundDuplicate: false, completedLifecycle: false },
    ] });
    expect(release.measurement).toEqual({ participants: 2, submissions: 2, unassistedSubmissionRate: 50, statusComprehensionRate: 50, duplicateDiscoveryRate: 50, lifecycleCompletionRate: 50 });
    expect(JSON.stringify(release.measurement)).not.toMatch(/P01|P02|email|name/i);
  });

  it("authorizes and records pseudonymous pilot sessions", async () => {
    const measurement = createPilotMeasurement(createMemoryPilotMeasurementStore());
    await expect(measurement.record({ uid: "resident", roles: ["Resident"] }, { participantCode: "P11", submitted: true, assisted: false, understoodStatus: true, foundDuplicate: true, completedLifecycle: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await measurement.record({ uid: "admin", roles: ["Administrator"] }, { participantCode: "P11", source: "exercise", expectedRevision: 0, submitted: true, assisted: false, understoodStatus: true, foundDuplicate: true, completedLifecycle: false });
    expect(await measurement.summary({ uid: "admin", roles: ["Administrator"] })).toMatchObject({ real: { participants: 0 }, exercise: { participants: 1, submissions: 1, unassistedSubmissionRate: 100, statusComprehensionRate: 100, duplicateDiscoveryRate: 100, lifecycleCompletionRate: 0, sampleSufficient: false, submissionTargetMet: false } });
  });
  it("aggregates representative report and media volume within the interaction target", () => {
    const fixture = createRepresentativePilotFixture();
    const started = performance.now();
    const release = createPilotRelease(fixture);
    expect(performance.now() - started).toBeLessThan(100);
    expect(release.analytics.totalReports).toBe(100);
    expect(fixture.reports.filter((report) => report.evidence.length)).toHaveLength(25);
  });});
