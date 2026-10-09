import { createMemoryReportStore, createReportModule } from "./report-module";

describe("report submission module", () => {
  it("submits one private report and exposes a privacy-safe public timeline", async () => {
    const reports = createReportModule({
      store: createMemoryReportStore(),
      now: () => new Date("2026-10-10T02:00:00.000Z"),
      nextReference: () => "AS-7K3M2Q",
    });

    const receipt = await reports.submit({
      residentUid: "resident-1",
      idempotencyKey: "submission-key-1234",
      category: "streetlights",
      description: "The streetlight beside the covered court no longer turns on at night.",
      nearbyLandmark: "Phase 2 covered court",
      isEmergency: false,
      confirmNonEmergency: true,
      confirmPublicSummary: true,
    });

    expect(receipt).toEqual({ reference: "AS-7K3M2Q", created: true });
    expect(await reports.listMine("resident-1")).toEqual([
      expect.objectContaining({ reference: "AS-7K3M2Q", status: "Submitted" }),
    ]);
    expect(await reports.getPublic("AS-7K3M2Q")).toEqual({
      reference: "AS-7K3M2Q",
      category: "streetlights",
      description: "The streetlight beside the covered court no longer turns on at night.",
      publicArea: "Phase 2 covered court",
      status: "Submitted",
      submittedAt: "2026-10-10T02:00:00.000Z",
      timeline: [{ status: "Submitted", occurredAt: "2026-10-10T02:00:00.000Z" }],
    });
  });

  it("rejects incomplete reports with field-addressable validation issues", async () => {
    const reports = createReportModule({ store: createMemoryReportStore() });

    await expect(reports.submit({
      residentUid: "resident-1",
      idempotencyKey: "short",
      category: "streetlights",
      description: "Too short",
      nearbyLandmark: "",
      isEmergency: false,
      confirmNonEmergency: false,
      confirmPublicSummary: false,
    })).rejects.toMatchObject({
      code: "VALIDATION",
      issues: {
        idempotencyKey: expect.any(String),
        description: expect.any(String),
        nearbyLandmark: expect.any(String),
        confirmNonEmergency: expect.any(String),
        confirmPublicSummary: expect.any(String),
      },
    });
  });

  it("diverts potential emergencies before creating a report", async () => {
    const reports = createReportModule({ store: createMemoryReportStore() });

    await expect(reports.submit({
      residentUid: "resident-1",
      idempotencyKey: "submission-key-1234",
      category: "roads-drainage",
      description: "Flood water is rising quickly and somebody may be in immediate danger.",
      nearbyLandmark: "Phase 1 entrance",
      isEmergency: true,
      confirmNonEmergency: true,
      confirmPublicSummary: true,
    })).rejects.toMatchObject({ code: "EMERGENCY" });
    expect(await reports.listMine("resident-1")).toEqual([]);
  });

  it("returns the original receipt when an ambiguous submission is retried", async () => {
    const reports = createReportModule({
      store: createMemoryReportStore(),
      nextReference: (() => {
        const references = ["AS-FIRST1", "AS-SECOND"];
        return () => references.shift() ?? "AS-EXTRA1";
      })(),
    });
    const submission = {
      residentUid: "resident-1",
      idempotencyKey: "same-submission-key",
      category: "waste-collection" as const,
      description: "Waste collection missed the marked pickup point for two scheduled rounds.",
      nearbyLandmark: "Phase 3 east entrance",
      isEmergency: false,
      confirmNonEmergency: true,
      confirmPublicSummary: true,
    };

    expect(await reports.submit(submission)).toEqual({ reference: "AS-FIRST1", created: true });
    expect(await reports.submit(submission)).toEqual({ reference: "AS-FIRST1", created: false });
    expect(await reports.listMine("resident-1")).toHaveLength(1);
  });
});
