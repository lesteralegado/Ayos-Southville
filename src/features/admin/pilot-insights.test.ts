import { createPilotInsights, type InsightReport } from "./pilot-insights";

const item = (overrides: Partial<InsightReport>): InsightReport => ({ category: "streetlights", status: "Resolved", submittedAt: "2026-10-09T15:30:00.000Z", publicArea: "Phase 2", timeline: [{ status: "Under review", occurredAt: "2026-10-09T16:30:00.000Z" }, { status: "Resolved", occurredAt: "2026-10-10T00:30:00.000Z" }], ...overrides });

describe("privacy-safe public pilot insights", () => {
  it("excludes nonpublic statuses, invalid durations, and cannot lower the area threshold", () => {
    const result = createPilotInsights([
      item({ status: "Rejected" }), item({ status: "Submitted" }), item({ status: "Duplicate" }),
      item({ publicArea: "Small area", timeline: [{ status: "Under review", occurredAt: "invalid" }, { status: "Resolved", occurredAt: "2000-01-01T00:00:00Z" }] }),
    ], { recurringAreaThreshold: 1 });
    expect(result.totals.all).toBe(1);
    expect(result.recurringAreas).toEqual([]);
    expect(result.medianFirstResponseHours).toBeNull();
    expect(result.medianResolutionHours).toBeNull();
  });
  it("returns empty-safe totals and correctly defined medians across Manila date boundaries", () => {
    expect(createPilotInsights([])).toEqual({ totals: { all: 0, byCategory: {}, byStatus: {} }, medianFirstResponseHours: null, medianResolutionHours: null, recurringAreas: [], residentConfirmed: 0 });
    const insights = createPilotInsights([
      item({}),
      item({ category: "roads-drainage", status: "Resident confirmed", submittedAt: "2026-10-10T15:30:00.000Z", publicArea: "Phase 2", timeline: [{ status: "Under review", occurredAt: "2026-10-10T17:30:00.000Z" }, { status: "Resolved", occurredAt: "2026-10-11T03:30:00.000Z" }] }),
      item({ category: "waste-collection", status: "Under review", submittedAt: "2026-10-08T20:00:00.000Z", publicArea: "Phase 2", timeline: [{ status: "Under review", occurredAt: "2026-10-09T00:00:00.000Z" }] }),
      item({ category: "streetlights", status: "Assigned", submittedAt: "2026-10-08T00:00:00.000Z", publicArea: "Phase 3", timeline: [{ status: "Under review", occurredAt: "2026-10-08T08:00:00.000Z" }] }),
    ], { recurringAreaThreshold: 3 });
    expect(insights).toMatchObject({ totals: { all: 4, byCategory: { streetlights: 2, "roads-drainage": 1, "waste-collection": 1 }, byStatus: { Resolved: 1, "Resident confirmed": 1, "Under review": 1, Assigned: 1 } }, medianFirstResponseHours: 3, medianResolutionHours: 10.5, residentConfirmed: 1, recurringAreas: [{ area: "Phase 2", reports: 3 }] });
    expect(JSON.stringify(insights)).not.toMatch(/reporter|contact|block|lot|staff/i);
  });
});
