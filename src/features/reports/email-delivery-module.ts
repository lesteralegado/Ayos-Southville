export type LifecycleEmail = { id: string; to: string; subject: string; text: string };
export type EmailJob = {
  id: string; residentUid: string; reference: string; audience: "status" | "follow";
  createdAt: string; status?: "pending" | "sent" | "skipped" | "manual-review";
  attempts?: number; nextAttemptAt?: string; firstAttemptAt?: string;
  leaseUntil?: string; leaseToken?: string; payload?: LifecycleEmail;
};
export type EmailAdapter = { send(email: LifecycleEmail): Promise<string> };
export type EmailDeliveryStore = {
  listDue(now: string, limit: number): Promise<string[]>;
  claim(id: string, now: string, token: string): Promise<EmailJob | null>;
  savePayload(id: string, token: string, payload: LifecycleEmail): Promise<void>;
  finish(id: string, token: string, result: { status: EmailJob["status"]; nextAttemptAt?: string; providerId?: string; failureCode?: string }): Promise<void>;
};
export class EmailDeliveryError extends Error {
  constructor(readonly retryable: boolean) { super("Email provider request failed."); }
}
export function createEmailDeliveryModule({ store, adapter, recipient, siteUrl, now = () => new Date() }: {
  store: EmailDeliveryStore; adapter: EmailAdapter; recipient: (job: EmailJob) => Promise<string | null>;
  siteUrl: string; now?: () => Date;
}) {
  const origin = new URL(siteUrl);
  if (origin.protocol !== "https:") throw new Error("A trusted HTTPS site URL is required.");
  return { async run() {
    const summary = { sent: 0, retried: 0, skipped: 0, review: 0 };
    const startedAt = now().getTime();
    for (const id of await store.listDue(now().toISOString(), 5)) {
      if (now().getTime() - startedAt >= 90_000) break;
      const token = crypto.randomUUID();
      const job = await store.claim(id, now().toISOString(), token);
      if (!job) continue;
      // Never retry an uncertain send beyond the provider's 24-hour key window.
      if (now().getTime() - Date.parse(job.firstAttemptAt!) >= 23 * 3_600_000) {
        await store.finish(id, token, { status: "manual-review", failureCode: "retry-window-expired" }); summary.review++; continue;
      }
      try {
        const to = await recipient(job);
        if (!to || (job.payload && job.payload.to !== to)) { await store.finish(id, token, { status: "skipped" }); summary.skipped++; continue; }
        const payload = job.payload ?? { id, to,
          subject: "Ayos Southville: report update / Update sa ulat",
          text: `There is an update for ${job.reference}. Sign in to read your private notifications.\nMay update para sa ${job.reference}. Mag-sign in upang basahin ang iyong pribadong abiso.\n\n${new URL("/account/notifications", origin).href}\n\nManage email preferences in Notifications. / Baguhin ang mga kagustuhan sa email sa Mga Abiso.\nAyos Southville is an independent resident-led pilot. / Isang malayang pilot na pinamumunuan ng mga residente.` };
        // Frozen request ensures every retry has identical content and recipient.
        if (!job.payload) await store.savePayload(id, token, payload);
        const providerId = await adapter.send(payload);
        await store.finish(id, token, { status: "sent", providerId }); summary.sent++;
      } catch (error) {
        const retryable = !(error instanceof EmailDeliveryError) || error.retryable;
        await store.finish(id, token, retryable
          ? { status: "pending", nextAttemptAt: new Date(now().getTime() + Math.min(3_600_000, 60_000 * 2 ** Math.min(job.attempts ?? 1, 6))).toISOString(), failureCode: "delivery-unavailable" }
          : { status: "manual-review", failureCode: "provider-rejected" });
        if (retryable) summary.retried++; else summary.review++;
      }
    }
    return summary;
  } };
}
export function createMemoryEmailDeliveryStore(seed: EmailJob[]): EmailDeliveryStore {
  const jobs = new Map(seed.map(job => [job.id, structuredClone(job)]));
  return {
    async listDue(time, limit) { return [...jobs.values()].filter(job => (job.status ?? "pending") === "pending" && (!job.nextAttemptAt || job.nextAttemptAt <= time) && (!job.leaseUntil || job.leaseUntil <= time)).slice(0, limit).map(job => job.id); },
    async claim(id, time, token) { const job = jobs.get(id); if (!job || (job.status ?? "pending") !== "pending" || (job.leaseUntil && job.leaseUntil > time) || (job.nextAttemptAt && job.nextAttemptAt > time)) return null; Object.assign(job, { leaseToken: token, leaseUntil: new Date(Date.parse(time) + 120_000).toISOString(), firstAttemptAt: job.firstAttemptAt ?? time, attempts: (job.attempts ?? 0) + 1 }); return structuredClone(job); },
    async savePayload(id, token, payload) { const job = jobs.get(id)!; if (job.leaseToken !== token) throw new Error("Lease changed"); job.payload = structuredClone(payload); },
    async finish(id, token, result) { const job = jobs.get(id)!; if (job.leaseToken !== token) throw new Error("Lease changed"); Object.assign(job, result, { leaseUntil: "", leaseToken: "" }); },
  };
}
