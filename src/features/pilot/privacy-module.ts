import type { Operator } from "@/features/reports/moderation-module";
export type DeletionRequest = { id: string; residentUid?: string; requestedAt: string; status: "requested" | "approved" | "cancelled" | "complete"; completedAt?: string };
export class PrivacyError extends Error {
  constructor(readonly status: number, readonly code: string) { super("Privacy request could not be completed. Reload and retry."); }
}
export function requirePrivacyAdmin(actor: Operator) {
  if (!actor.roles.includes("Administrator")) throw new PrivacyError(403, "FORBIDDEN");
}
export function createPrivacyModule({ store, now = () => new Date() }: {
  store: {
    mine(uid: string): Promise<DeletionRequest | null>;
    list(): Promise<DeletionRequest[]>;
    requestOnce(request: DeletionRequest): Promise<DeletionRequest>;
    decide(id: string, status: "approved" | "cancelled", actor: Operator): Promise<void>;
  }; now?: () => Date;
}) {
  return {
    mine: (uid: string) => store.mine(uid),
    async request(uid: string, confirmed: unknown) {
      if (confirmed !== true) throw new PrivacyError(422, "CONFIRM_REQUIRED");
      return store.requestOnce({ id: crypto.randomUUID(), residentUid: uid, requestedAt: now().toISOString(), status: "requested" });
    },
    async list(actor: Operator) { requirePrivacyAdmin(actor); return store.list(); },
    async decide(actor: Operator, id: string, status: "approved" | "cancelled") {
      requirePrivacyAdmin(actor);
      if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id) || !["approved", "cancelled"].includes(status)) throw new PrivacyError(422, "VALIDATION");
      await store.decide(id, status, actor);
    },
  };
}
