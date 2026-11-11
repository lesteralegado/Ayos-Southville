import { createMemoryReportStore, createReportModule } from "./report-module";
import { createMemoryModerationStore, createModerationModule, type ModerationReport } from "./moderation-module";

const actor = { uid: "operator", roles: ["Administrator"] as const };
const timestamp = "2026-11-02T00:00:00.000Z";
const seed = (index: number): ModerationReport => ({
  reference: `AS-${String(index).padStart(6, "0")}`, reporterUid: "resident", category: "streetlights", status: "Submitted",
  description: "Private synthetic concern", nearbyLandmark: "Court", evidence: index < 25 ? [{ id: "a".repeat(64), name: "test.jpg", type: "image/jpeg", size: 50, visibility: "restricted" }] : [],
  submittedAt: timestamp, public: { summary: "", area: "", media: [] }, followers: [], affectedResidents: [], supportingEvidence: [], history: [],
});

it("traverses 100 resident reports with tied dates exactly once and still opens an older owned receipt", async () => {
  let sequence = 0;
  const reports = createReportModule({ store: createMemoryReportStore(), now: () => new Date(timestamp), nextReference: () => `AS-${String(++sequence).padStart(6, "0")}` });
  for (let index = 0; index < 100; index++) await reports.submit({ residentUid: "resident", idempotencyKey: `synthetic-draft-${index}`, category: "streetlights", description: "Synthetic private streetlight concern. ".repeat(25), nearbyLandmark: "Court", evidence: [], isEmergency: false, confirmNonEmergency: true, confirmPublicSummary: true });
  const references: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await reports.listMinePage("resident", cursor);
    expect(page.reports.length).toBeLessThanOrEqual(20);
    references.push(...page.reports.map(report => report.reference));
    cursor = page.nextCursor;
  } while (cursor);
  expect(references).toHaveLength(100);
  expect(new Set(references).size).toBe(100);
  expect(references[0]).toBe("AS-000100");
  expect(await reports.getMine("resident", "AS-000001")).toMatchObject({ reference: "AS-000001" });
  expect(await reports.getMine("other", "AS-000001")).toBeNull();
  expect(await reports.listMinePage("other")).toEqual({ reports: [], nextCursor: null });
  expect(await reports.listMine("resident")).toHaveLength(20);
  await expect(reports.listMinePage("resident", "malformed")).rejects.toMatchObject({ code: "VALIDATION" });
});

it("continues through an empty overdue scan window and finds matches beyond it without exposing private details in queue rows", async () => {
  const items = Array.from({ length: 121 }, (_, index) => seed(index));
  for (const report of items.slice(21)) report.review = { acknowledgedAt: timestamp, nextStep: "Reviewed", actorUid: "operator" };
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: items }), now: () => new Date("2026-11-06T00:00:00Z"), operations: async () => ({ revision: 1, primaryUid: "operator", backupUid: "backup", backupAffirmed: true, intakePaused: false, invitationsPaused: false, publicRestricted: false, explanation: { en: "", fil: "" }, resumesAt: "", reviewCalendar: { from: "2026-11-01", through: "2026-11-30", holidays: [], source: "Synthetic calendar", ownerConfirmed: true } }) });
  const first = await moderation.listWorkspacePage(actor, { filter: "overdue" });
  expect(first.reports).toEqual([]);
  expect(first.nextCursor).toEqual(expect.any(String));
  const second = await moderation.listWorkspacePage(actor, { filter: "overdue", cursor: first.nextCursor });
  expect(second.reports).toHaveLength(20);
  const last = await moderation.listWorkspacePage(actor, { filter: "overdue", cursor: second.nextCursor });
  expect(last.reports).toHaveLength(1);
  expect(last.nextCursor).toBeNull();
  expect(JSON.stringify(second.reports)).not.toMatch(/Private synthetic concern|evidence|reporterUid|nextStep/);
  await expect(moderation.listWorkspacePage({ uid: "resident", roles: ["Resident"] }, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(moderation.listWorkspacePage(actor, { filter: "all", cursor: first.nextCursor })).rejects.toMatchObject({ code: "VALIDATION" });
});
