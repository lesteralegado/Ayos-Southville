import { describe, expect, it } from "vitest";
import { createDiscoveryModule } from "./discovery-module";

const accepted = (reference = "AS-ABC123", extra = {}) => ({
  reference, approved: true, category: "streetlights", status: "Assigned",
  publicSummary: "An approved streetlight concern.", publicArea: "Phase 1",
  submittedAt: "2026-10-10T00:00:00Z", media: [], timeline: [], ...extra,
});

describe("public discovery boundary", () => {
  it("includes legacy assignment when filtering the simplified In progress stage", async () => {
    const discovery = createDiscoveryModule({ read: async () => [accepted(), accepted("AS-WORK", { status: "In progress" })] });
    expect((await discovery.list(new URLSearchParams({ status: "In progress" }))).reports).toHaveLength(2);
  });
  it("isolates demo records and fails rather than reporting partial aggregates", async () => {
    const discovery = createDiscoveryModule({ mode: "demo", read: async () => [accepted(), accepted("DEMO-001", { demonstration: true })] });
    expect((await discovery.list(new URLSearchParams())).reports.map((report) => report.reference)).toEqual(["DEMO-001"]);
    await expect(createDiscoveryModule({ read: async () => Array.from({ length: 501 }, () => accepted()) }).all()).rejects.toMatchObject({ code: "CAPACITY" });
    await expect(createDiscoveryModule({ read: async () => { throw new Error("Firebase offline"); } }).list(new URLSearchParams())).rejects.toThrow("Firebase offline");
  });
  it("publishes only approved live projections and strips nested private fields", async () => {
    const discovery = createDiscoveryModule({ read: async () => [
      accepted(), accepted("AS-BBB123", { approved: false }),
      accepted("AS-CCC123", { status: "Rejected" }),
      accepted("DEMO-001", { demonstration: true }),
      accepted("AS-DDD123", { reporterEmail: "private@example.com", exactLocation: { latitude: 14.28123 },
        publicLocation: { latitude: 14.28123, longitude: 121.12789, privateDetails: "House 12" },
        timeline: [{ status: "Assigned", occurredAt: "2026-10-10T01:00:00Z", internalNotes: "secret" }] }),
    ] });
    const result = await discovery.list(new URLSearchParams());
    expect(result.total).toBe(2);
    expect(result.reports[1].publicLocation).toEqual({ latitude: 14.28123, longitude: 121.12789 });
    expect(JSON.stringify(result)).not.toMatch(/private@example|House 12|internalNotes|exactLocation|reporterEmail/);
  });
  it("filters against the actual current date and shares a bounded result page between map and list", async () => {
    const discovery = createDiscoveryModule({ now: () => new Date("2026-10-11T00:00:00Z"), read: async () => [
      ...Array.from({ length: 25 }, (_, i) => accepted(`AS-${String(i).padStart(6, "0")}`, {
        publicLocation: { latitude: 14.28, longitude: 121.13 },
      })), accepted("AS-OLD123", { submittedAt: "2026-09-01T00:00:00Z" }),
      accepted("AS-FAR123", { publicLocation: { latitude: 15, longitude: 122 } }),
    ] });
    const first = await discovery.list(new URLSearchParams("category=streetlights&status=Assigned&date=7&distance=1"));
    expect(first.total).toBe(25);
    expect(first.reports).toHaveLength(20);
    expect(first.page).toBe(1);
    const second = await discovery.list(new URLSearchParams("category=streetlights&status=Assigned&date=7&distance=1&page=2&view=map"));
    expect(second.reports).toHaveLength(5);
    expect(second.reports[0].reference).toBe("AS-000020");
    expect(second.reports.some((report) => first.reports.some((other) => other.reference === report.reference))).toBe(false);
    expect((await discovery.list(new URLSearchParams("category=none"))).total).toBe(0);
    await expect(discovery.list(new URLSearchParams("date=banana"))).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
