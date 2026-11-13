import { createEngagementModule, createMemoryEngagementStore } from "./engagement-module";

describe("report engagement boundary", () => {
  it("stops both legacy affected and following updates without deleting protected evidence", async () => {
    const engagement = createEngagementModule({ store: createMemoryEngagementStore() });
    await engagement.setAffected({ residentUid: "r1", reference: "AS-UPDATES", active: true, evidence: [{ id: "photo", name: "proof.jpg", size: 10, type: "image/jpeg", visibility: "restricted" }] });
    await engagement.setUpdates({ residentUid: "r1", reference: "AS-UPDATES", active: false });
    expect(await engagement.getResidentState("r1", "AS-UPDATES")).toMatchObject({ affected: false, following: false, supportingEvidence: [{ id: "photo" }] });
  });
  it("explains nearby unresolved duplicate suggestions and excludes weak matches", async () => {
    const engagement = createEngagementModule({ store: createMemoryEngagementStore({
      reports: [
        { reference: "AS-NEAR", category: "streetlights", status: "Submitted", submittedAt: "2026-10-08T00:00:00.000Z", publicLocation: { latitude: 14.281, longitude: 121.127 } },
        { reference: "AS-FAR", category: "streetlights", status: "Submitted", submittedAt: "2026-10-08T00:00:00.000Z", publicLocation: { latitude: 14.35, longitude: 121.2 } },
        { reference: "AS-OLD", category: "streetlights", status: "Submitted", submittedAt: "2026-07-01T00:00:00.000Z", publicLocation: { latitude: 14.281, longitude: 121.127 } },
        { reference: "AS-OTHER", category: "waste-collection", status: "Submitted", submittedAt: "2026-10-08T00:00:00.000Z", publicLocation: { latitude: 14.281, longitude: 121.127 } },
      ],
    }), now: () => new Date("2026-10-10T00:00:00.000Z") });
    await expect(engagement.suggestDuplicates({ category: "streetlights", latitude: 14.282, longitude: 121.128 })).resolves.toEqual([
      expect.objectContaining({ reference: "AS-NEAR", reasons: expect.arrayContaining(["Same category", "Nearby", "Reported recently", "Still unresolved"]) }),
    ]);
  });

  it("keeps affected and follow relationships unique and creates private notifications", async () => {
    const engagement = createEngagementModule({ store: createMemoryEngagementStore() });
    await engagement.setAffected({ residentUid: "r1", reference: "AS-1", active: true, evidence: [{ id: "private-photo", name: "proof.jpg", type: "image/jpeg", size: 10, visibility: "restricted" }] });
    await engagement.setAffected({ residentUid: "r1", reference: "AS-1", active: true, evidence: [] });
    await engagement.setFollow({ residentUid: "r1", reference: "AS-1", active: true });
    expect(await engagement.getResidentState("r1", "AS-1")).toMatchObject({ affected: true, following: true });
    expect(await engagement.listNotifications("r1")).toHaveLength(2);
    await engagement.setAffected({ residentUid: "r1", reference: "AS-1", active: false, evidence: [] });
    expect(await engagement.getResidentState("r1", "AS-1")).toMatchObject({ affected: false, following: true });
  });

  it("marks notifications read and stores resident delivery preferences", async () => {
    const engagement = createEngagementModule({ store: createMemoryEngagementStore() });
    await engagement.setFollow({ residentUid: "r1", reference: "AS-2", active: true });
    const [notice] = await engagement.listNotifications("r1");
    await engagement.markNotificationRead("r1", notice.id);
    await engagement.setPreferences("r1", { emailEnabled: true, statusUpdates: true, followUpdates: false });
    expect(await engagement.listNotifications("r1")).toEqual([expect.objectContaining({ read: true })]);
    expect(await engagement.getPreferences("r1")).toEqual({ emailEnabled: true, statusUpdates: true, followUpdates: false });
  });
});
