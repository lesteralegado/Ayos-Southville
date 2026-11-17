import { createMemoryModerationStore, createModerationModule, type ModerationReport } from "./moderation-module";
import { preparePublicDraft } from "./public-report-draft";

const actor = { uid: "operator", roles: ["Administrator"] as const };
const resident = { uid: "resident", roles: ["Resident"] as const };
const reference = "AS-CLARIFY";
function setup() {
  const report: ModerationReport = { reference, reporterUid: resident.uid, category: "streetlights", description: "Light near the entrance", nearbyLandmark: "Court", status: "Submitted", submittedAt: "2026-11-13T00:00:00Z", evidence: [], followers: ["neighbor"], affectedResidents: [], supportingEvidence: [], history: [], public: { summary: "Unpublished", area: "Court", media: [] } };
  const store = createMemoryModerationStore({ reports: [report] });
  return { store, module: createModerationModule({ store }) };
}
it("privately requests, answers and reviews a correction without replacing the original or publishing it", async () => {
  const { store, module } = setup();
  await module.requestClarification(actor, { reference, expectedRevision: 0, operationId: "question-1", question: "Which entrance?" });
  await module.respondToClarification(resident, { reference, expectedRevision: 1, operationId: "response-1", requestId: "question-1", explanation: "The north entrance", description: "Broken light at the north entrance", location: { latitude: 14.281234567, longitude: 121.126789123 } });
  expect((await store.getReport(reference))?.description).toBe("Light near the entrance");
  await module.reviewClarification(actor, { reference, expectedRevision: 2, operationId: "review-1", requestId: "question-1", decision: "accepted", reason: "Resident correction reviewed" });
  const report = await module.getPrivateReport(actor, reference);
  expect(preparePublicDraft(report)).toMatchObject({ summary: "Broken light at the north entrance", latitude: "14.281234567", longitude: "121.126789123" });
  expect(report.description).toBe("Light near the entrance");
  await expect(module.getPublicReport(reference)).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await store.listNotifications("neighbor")).toHaveLength(0);
  expect(await store.listNotifications(resident.uid)).toHaveLength(1);
});
it("deduplicates delivery and rejects stale, concurrent and cross-owner replies", async () => {
  const { store, module } = setup();
  const question = { reference, expectedRevision: 0, operationId: "question-1", question: "Which entrance?" };
  const attempts = await Promise.allSettled([module.requestClarification(actor, question), module.requestClarification(actor, { ...question, operationId: "question-2" })]);
  expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
  await module.requestClarification(actor, question);
  const response = { reference, expectedRevision: 1, operationId: "reply-1", requestId: "question-1", explanation: "North entrance" };
  await expect(module.respondToClarification({ uid: "neighbor", roles: ["Resident"] }, response)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(module.respondToClarification(resident, { ...response, expectedRevision: 0 })).rejects.toMatchObject({ code: "CONFLICT" });
  await module.respondToClarification(resident, response);
  await module.respondToClarification(resident, response);
  expect((await store.getReport(reference))?.history).toHaveLength(2);
  expect(await store.listNotifications(resident.uid)).toHaveLength(1);
});
it("preserves publication capabilities and requires privacy review for a public correction", async () => {
  const { store, module } = setup();
  await module.accept(actor, { reference, expectedRevision: 0, publicSummary: "Broken light", publicArea: "Court", approvedMedia: [], reason: "Reviewed" });
  const original = structuredClone((await store.getReport(reference))?.public);
  const coordinator = { uid: "coordinator", roles: ["Coordinator"] as const };
  await module.requestClarification(coordinator, { reference, expectedRevision: 1, operationId: "question-1", question: "Which entrance?" });
  await expect(module.transition(actor, { reference, expectedRevision: 2, to: "In progress", update: { en: "Started", fil: "" } })).rejects.toMatchObject({ code: "VALIDATION" });
  await module.respondToClarification(resident, { reference, expectedRevision: 2, operationId: "reply-1", requestId: "question-1", explanation: "North", description: "North entrance light", location: { latitude: 14.281234567, longitude: 121.126789123 } });
  await module.reviewClarification(coordinator, { reference, expectedRevision: 3, operationId: "review-1", requestId: "question-1", decision: "accepted", reason: "Confirmed by resident" });
  expect((await store.getReport(reference))?.public).toEqual(original);
  const publication = { reference, expectedRevision: 4, operationId: "publish-1", publicSummary: "North entrance light", publicArea: "Court", privacyReviewed: true };
  await expect(module.publishClarification(coordinator, publication)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(module.publishClarification(actor, { ...publication, privacyReviewed: false })).rejects.toMatchObject({ code: "VALIDATION" });
  await module.publishClarification(actor, publication);
  await module.publishClarification(actor, publication);
  expect((await store.getReport(reference))?.public).toMatchObject({ summary: "North entrance light", location: { latitude: 14.281234567, longitude: 121.126789123 } });
});
it.each(["Rejected", "Duplicate", "Resolved", "Resident confirmed", "Archived"])("rejects answers after %s without restoring a closed report", async status => {
  const { store, module } = setup();
  await module.requestClarification(actor, { reference, expectedRevision: 0, operationId: "question-1", question: "Which entrance?" });
  const current = (await store.getReport(reference))!;
  if (status === "Archived") current.archivedAt = new Date().toISOString();
  else current.status = status as ModerationReport["status"];
  await store.commit({ actorUid: actor.uid, reports: [current], notifications: [], audit: { actorUid: actor.uid, action: "test.closed", target: reference, occurredAt: new Date().toISOString(), reason: "Closed fixture" } });
  await expect(module.respondToClarification(resident, { reference, expectedRevision: 2, operationId: "reply-1", requestId: "question-1", explanation: "North entrance" })).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await store.getReport(reference))?.clarifications?.[0].response).toBeUndefined();
});
it("validates bounded questions, replies and pins and permits a follow-up only after handling the active request", async () => {
  const { module } = setup();
  const question = { reference, expectedRevision: 0, operationId: "question-1", question: "Which entrance?" };
  await expect(module.requestClarification(resident, question)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(module.requestClarification(actor, { ...question, question: " ".repeat(4) })).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(module.requestClarification(actor, { ...question, question: "x".repeat(1001) })).rejects.toMatchObject({ code: "VALIDATION" });
  await module.requestClarification(actor, question);
  await expect(module.requestClarification(actor, { ...question, expectedRevision: 1, operationId: "question-2" })).rejects.toMatchObject({ code: "VALIDATION" });
  const response = { reference, expectedRevision: 1, operationId: "reply-1", requestId: "question-1", explanation: "North entrance" };
  await expect(module.respondToClarification(resident, { ...response, explanation: "x".repeat(1001) })).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(module.respondToClarification(resident, { ...response, location: { latitude: 91, longitude: 120 } })).rejects.toMatchObject({ code: "VALIDATION" });
  await module.reviewClarification(actor, { reference, expectedRevision: 1, operationId: "review-1", requestId: "question-1", decision: "declined", reason: "Question withdrawn" });
  await expect(module.respondToClarification(resident, { ...response, expectedRevision: 2 })).rejects.toMatchObject({ code: "CONFLICT" });
  await module.requestClarification(actor, { ...question, expectedRevision: 2, operationId: "question-2" });
});
