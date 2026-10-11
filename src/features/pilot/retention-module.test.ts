import { expect, it } from "vitest";
import { createRetentionModule, type RetentionRecord } from "./retention-module";

it("previews exact retention deadlines without deleting and safely repeats cleanup", async () => {
  const records: RetentionRecord[] = [
    { key: "abandoned", kind: "upload", createdAt: "2026-10-10T00:00:00Z" },
    { key: "attached", kind: "upload", createdAt: "2025-01-01T00:00:00Z", attachedTo: "active" },
    { key: "rejected", kind: "upload", createdAt: "2025-01-01T00:00:00Z", attachedTo: "rejected", rejectedAt: "2026-09-11T00:00:00Z" },
    { key: "fresh", kind: "upload", createdAt: "2026-10-10T00:00:01Z" },
    { key: "audit", kind: "audit", createdAt: "2025-10-11T00:00:00Z" },
    { key: "invalid", kind: "upload", createdAt: "not-a-date" },
  ];
  const remaining = new Map(records.map(record => [record.key, record]));
  const cleanup = createRetentionModule({ now: () => new Date("2026-10-11T00:00:00Z"), store: {
    inventory: async () => [...remaining.values()], remove: async record => remaining.delete(record.key),
  } });
  expect(await cleanup.run()).toEqual({ mode: "dry-run", eligible: 3, removed: 0, skipped: 3 });
  expect(await cleanup.run({ apply: true })).toEqual({ mode: "apply", eligible: 3, removed: 3, skipped: 3 });
  expect(await cleanup.run({ apply: true })).toEqual({ mode: "apply", eligible: 0, removed: 0, skipped: 3 });
});
