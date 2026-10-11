import { createEmailDeliveryModule, createMemoryEmailDeliveryStore } from "./email-delivery-module";

it("allows only one overlapping worker to deliver and excludes private report content", async () => {
  const store = createMemoryEmailDeliveryStore([{ id: "notice-concurrent", residentUid: "resident", reference: "AS-400001", audience: "status", createdAt: "2026-10-11T00:00:00Z" }]);
  const emails: { id: string; text: string }[] = [];
  const delivery = createEmailDeliveryModule({ store, now: () => new Date("2026-10-11T00:00:00Z"), recipient: async () => "resident@example.test", adapter: { async send(email) { emails.push(email); return "provider-1"; } }, siteUrl: "https://pilot.example.test" });
  const runs = await Promise.all([delivery.run(), delivery.run()]);
  expect(runs.reduce((count, run) => count + run.sent, 0)).toBe(1);
  expect(emails).toHaveLength(1); expect(emails[0].text).toContain("https://pilot.example.test/account/notifications");
  expect(emails[0].text).not.toMatch(/private description|reason|household/);
});

it("skips opt-outs and prevents overlapping workers from sending the same notice", async () => {
  const store = createMemoryEmailDeliveryStore([{ id: "notice-2", residentUid: "resident", reference: "AS-400001", audience: "follow", createdAt: "2026-10-11T00:00:00Z" }]);
  const accepted: string[] = [];
  const delivery = createEmailDeliveryModule({ store, now: () => new Date("2026-10-11T00:00:00Z"), recipient: async () => null, adapter: { async send(email) { accepted.push(email.id); return "sent"; } }, siteUrl: "https://pilot.example.test" });
  const runs = await Promise.all([delivery.run(), delivery.run()]);
  expect(runs.reduce((count, run) => count + run.skipped, 0)).toBe(1);
  expect(accepted).toEqual([]);
});

it("does not retry an uncertain delivery after the provider idempotency window", async () => {
  const store = createMemoryEmailDeliveryStore([{ id: "notice-old", residentUid: "resident", reference: "AS-400001", audience: "status", firstAttemptAt: "2026-10-10T00:00:00Z", createdAt: "2026-10-10T00:00:00Z" }]);
  const accepted: string[] = [];
  const delivery = createEmailDeliveryModule({ store, now: () => new Date("2026-10-11T00:00:00Z"), recipient: async () => "resident@example.test", adapter: { async send(email) { accepted.push(email.id); return "sent"; } }, siteUrl: "https://pilot.example.test" });
  expect(await delivery.run()).toMatchObject({ review: 1 });
  expect(accepted).toEqual([]);
});

it("retries a failed delivery with the same identity and never resends a completed job", async () => {
  let time = new Date("2026-10-11T00:00:00Z");
  const store = createMemoryEmailDeliveryStore([{ id: "notice-1", residentUid: "resident", reference: "AS-400001", audience: "status", createdAt: time.toISOString() }]);
  let available = false;
  const accepted = new Set<string>();
  const delivery = createEmailDeliveryModule({ store, now: () => time, recipient: async () => "resident@example.test", adapter: { async send(email) { if (!available) throw new Error("Unavailable"); accepted.add(email.id); return "provider-1"; } }, siteUrl: "https://pilot.example.test" });
  expect(await delivery.run()).toMatchObject({ retried: 1, sent: 0 });
  available = true;
  time = new Date("2026-10-11T00:10:00Z");
  expect(await delivery.run()).toMatchObject({ sent: 1 });
  expect(await delivery.run()).toMatchObject({ sent: 0 });
  expect([...accepted]).toEqual(["notice-1"]);
});
