export type RetentionRecord = {
  key: string; kind: "upload" | "audit" | "pilot" | "ephemeral";
  createdAt: string; attachedTo?: string; rejectedAt?: string; expiresAt?: string;
};
export function retentionExpired(record: RetentionRecord, now: Date, pilotEndedAt?: string) {
  const time = now.getTime(), created = Date.parse(record.createdAt);
  const pilotEnd = Date.parse(pilotEndedAt ?? "");
  if (record.kind !== "audit" && Number.isFinite(pilotEnd) && time >= pilotEnd + 90 * 86_400_000) return true;
  if (record.kind === "ephemeral") return Number.isFinite(Date.parse(record.expiresAt ?? "")) && time >= Date.parse(record.expiresAt!);
  if (!Number.isFinite(created)) return false;
  if (record.kind === "audit") return time >= created + 365 * 86_400_000;
  if (record.kind === "upload") {
    if (!record.attachedTo) return time >= created + 86_400_000;
    const rejected = Date.parse(record.rejectedAt ?? "");
    return Number.isFinite(rejected) && time >= rejected + 30 * 86_400_000;
  }
  return false;
}
export function createRetentionModule({ store, now = () => new Date() }: {
  store: { inventory(): Promise<RetentionRecord[]>; remove(record: RetentionRecord, now: Date, pilotEndedAt?: string): Promise<boolean> };
  now?: () => Date;
}) {
  return { async run({ apply = false, pilotEndedAt }: { apply?: boolean; pilotEndedAt?: string } = {}) {
    if (pilotEndedAt && !Number.isFinite(Date.parse(pilotEndedAt))) throw new Error("Invalid pilot end.");
    const time = now(), records = await store.inventory();
    const eligible = records.filter(record => retentionExpired(record, time, pilotEndedAt));
    let removed = 0;
    if (apply) for (const record of eligible) if (await store.remove(record, time, pilotEndedAt)) removed++;
    return { mode: apply ? "apply" : "dry-run", eligible: eligible.length, removed, skipped: records.length - eligible.length };
  } };
}
