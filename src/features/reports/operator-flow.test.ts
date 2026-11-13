import { createMemoryModerationStore, createModerationModule, type ModerationReport } from "./moderation-module";
import { preparePublicDraft } from "./public-report-draft";
const actor = { uid: "operator", roles: ["Administrator"] as const };
const report: ModerationReport = { reference: "AS-FLOW01", reporterUid: "resident", category: "streetlights", description: "The light near the court is broken.", nearbyLandmark: "Covered court", exactLocation: { latitude: 14.281234, longitude: 121.127234, privateDetails: "Private gate" }, evidence: [{ id: "photo", name: "private.jpg", type: "image/jpeg", size: 100, visibility: "restricted" }], status: "Submitted", submittedAt: "2026-11-12T00:00:00Z", public: { summary: "", area: "", media: [] }, followers: [], affectedResidents: [], supportingEvidence: [], history: [] };
it("prepares editable public fields without selecting photos or copying private location details", () => {
  expect(preparePublicDraft(report)).toEqual({ summary: report.description, area: "Covered court", latitude: "14.281234", longitude: "121.127234" });
});
it("publishes edited fields, assigns review ownership and goes directly to work with atomic notifications", async () => {
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: [report] }) });
  await moderation.accept(actor, { reference: report.reference, expectedRevision: 0, publicSummary: "Reviewed light concern.", publicArea: "Court", approvedMedia: [], reason: "Privacy reviewed." });
  expect(await moderation.getPrivateReport(actor, report.reference)).toMatchObject({ status: "Under review", reviewOwnerUid: "operator", review: { actorUid: "operator" } });
  await moderation.transition(actor, { reference: report.reference, expectedRevision: 1, to: "In progress", update: { en: "Work has started.", fil: "Nagsimula ang gawain." } });
  expect(await moderation.getPublicReport(report.reference)).toMatchObject({ status: "In progress", summary: "Reviewed light concern.", media: [] });
  expect(await moderation.listNotifications("resident")).toHaveLength(2);
  await moderation.transition(actor, { reference: report.reference, expectedRevision: 2, to: "Resolved", update: { en: "Repair checked.", fil: "Nasuri ang pagkukumpuni." }, resolutionEvidence: [{ id: "proof", name: "proof.jpg", type: "image/jpeg", size: 20, visibility: "restricted" }] });
  expect(await moderation.getPublicReport(report.reference)).toMatchObject({ status: "Resolved" });
  expect(await moderation.listNotifications("resident")).toHaveLength(3);
});
it("traverses owned work before newer reports from other owners without duplicates", async () => {
  const seed = Array.from({ length: 45 }, (_, index) => ({ ...report, reference: `AS-OWN${String(index).padStart(3, "0")}`, status: "Under review" as const, submittedAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(), ...(index < 22 ? { reviewOwnerUid: actor.uid } : {}) }));
  const moderation = createModerationModule({ store: createMemoryModerationStore({ reports: seed }) });
  const seen: string[] = []; let cursor: string | null = null;
  do { const page = await moderation.listWorkspacePage(actor, { filter: "working", ownedFirst: true, cursor }); seen.push(...page.reports.map(item => item.reference)); cursor = page.nextCursor; } while (cursor);
  expect(seen).toHaveLength(45); expect(new Set(seen).size).toBe(45);
  expect(seen.slice(0, 22)).toEqual(seed.slice(0, 22).toReversed().map(item => item.reference));
});
