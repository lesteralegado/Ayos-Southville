import { createEngagementModule, createMemoryEngagementStore } from "./engagement-module";
it("rejects malformed preferences without changing saved consent", async () => {
  const engagement = createEngagementModule({ store: createMemoryEngagementStore() });
  await engagement.setPreferences("resident", { emailEnabled: true, statusUpdates: true, followUpdates: false });
  await expect(engagement.setPreferences("resident", { emailEnabled: "yes", statusUpdates: true, followUpdates: true } as never)).rejects.toThrow();
  expect(await engagement.getPreferences("resident")).toEqual({ emailEnabled: true, statusUpdates: true, followUpdates: false });
});
