import { createEngagementModule, createMemoryEngagementStore } from "./engagement-module";
it("pages tied updates without duplicates and refuses a cursor belonging to another resident", async () => {
  const engagement = createEngagementModule({ store: createMemoryEngagementStore(), now: () => new Date("2026-11-12T00:00:00Z") });
  for (let index = 0; index < 25; index++) await engagement.recordReportEvent("resident", `AS-${index}`, "An update");
  const first = await engagement.listNotificationsPage("resident");
  const second = await engagement.listNotificationsPage("resident", first.nextCursor);
  expect(first.notifications).toHaveLength(20);
  expect(second.notifications).toHaveLength(5);
  expect(new Set([...first.notifications, ...second.notifications].map(item => item.id)).size).toBe(25);
  await expect(engagement.listNotificationsPage("other", first.nextCursor)).rejects.toThrow();
});
