import type { EvidenceAsset, ReportCategory, ReportStatus } from "./report-module";

export type SuggestionReport = { reference: string; category: ReportCategory; status: ReportStatus | "Resolved" | "Rejected" | "Duplicate"; submittedAt: string; publicLocation?: { latitude: number; longitude: number } };
export type DuplicateSuggestion = SuggestionReport & { distanceKm: number; reasons: string[] };
export type NotificationPreferences = { emailEnabled: boolean; statusUpdates: boolean; followUpdates: boolean };
export type ResidentReportState = { affected: boolean; following: boolean; supportingEvidence: EvidenceAsset[] };
export type ResidentNotification = { id: string; residentUid: string; reference: string; kind: "affected" | "follow" | "report-update"; message: string; createdAt: string; read: boolean };

export type EngagementStore = {
  listSuggestionReports(): Promise<SuggestionReport[]>;
  getResidentState(residentUid: string, reference: string): Promise<ResidentReportState>;
  setResidentState(residentUid: string, reference: string, state: ResidentReportState): Promise<void>;
  addNotificationOnce(key: string, notification: ResidentNotification): Promise<void>;
  listNotifications(residentUid: string): Promise<ResidentNotification[]>;
  markNotificationRead(residentUid: string, id: string): Promise<void>;
  getPreferences(residentUid: string): Promise<NotificationPreferences | null>;
  setPreferences(residentUid: string, preferences: NotificationPreferences): Promise<void>;
};

const defaults: NotificationPreferences = { emailEnabled: false, statusUpdates: true, followUpdates: true };
const emptyState = (): ResidentReportState => ({ affected: false, following: false, supportingEvidence: [] });
const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) =>
  Math.hypot((a.latitude - b.latitude) * 111, (a.longitude - b.longitude) * 107);

export class EngagementValidationError extends Error {}

function validateEvidence(evidence: EvidenceAsset[]) {
  if (evidence.length > 5 || evidence.some((asset) => !asset.id || !asset.name || asset.size < 0 || asset.size > 8_000_000 || asset.visibility !== "restricted" || !["image/jpeg", "image/png", "image/webp"].includes(asset.type))) {
    throw new EngagementValidationError("Attach up to 5 supported photos, no more than 8 MB each.");
  }
}

export function createEngagementModule({ store, now = () => new Date() }: { store: EngagementStore; now?: () => Date }) {
  const notify = (residentUid: string, reference: string, kind: ResidentNotification["kind"], message: string) =>
    store.addNotificationOnce(`${residentUid}:${reference}:${kind}`, { id: crypto.randomUUID(), residentUid, reference, kind, message, createdAt: now().toISOString(), read: false });
  return {
    async suggestDuplicates(input: { category: ReportCategory; latitude: number; longitude: number }) {
      const cutoff = now().getTime() - 30 * 86_400_000;
      const origin = { latitude: input.latitude, longitude: input.longitude };
      return (await store.listSuggestionReports()).flatMap((report): DuplicateSuggestion[] => {
        if (report.category !== input.category || !report.publicLocation || ["Resolved", "Rejected", "Duplicate"].includes(report.status) || Date.parse(report.submittedAt) < cutoff) return [];
        const distance = distanceKm(origin, report.publicLocation);
        return distance <= 1.5 ? [{ ...report, distanceKm: Number(distance.toFixed(1)), reasons: ["Same category", "Nearby", "Reported recently", "Still unresolved"] }] : [];
      }).toSorted((left, right) => left.distanceKm - right.distanceKm);
    },
    getResidentState: (residentUid: string, reference: string) => store.getResidentState(residentUid, reference),
    async setAffected(input: { residentUid: string; reference: string; active: boolean; evidence: EvidenceAsset[] }) {
      validateEvidence(input.evidence);
      const current = await store.getResidentState(input.residentUid, input.reference);
      if (current.affected === input.active && input.evidence.length === 0) return current;
      const next = { ...current, affected: input.active, supportingEvidence: input.active ? [...current.supportingEvidence, ...input.evidence] : [] };
      await store.setResidentState(input.residentUid, input.reference, next);
      if (input.active) await notify(input.residentUid, input.reference, "affected", "You marked this report as affecting you.");
      return next;
    },
    async setFollow(input: { residentUid: string; reference: string; active: boolean }) {
      const current = await store.getResidentState(input.residentUid, input.reference);
      if (current.following === input.active) return current;
      const next = { ...current, following: input.active };
      await store.setResidentState(input.residentUid, input.reference, next);
      if (input.active) await notify(input.residentUid, input.reference, "follow", "You are now following this report.");
      return next;
    },
    recordReportEvent: (residentUid: string, reference: string, message: string) => notify(residentUid, reference, "report-update", message),
    listNotifications: (residentUid: string) => store.listNotifications(residentUid),
    markNotificationRead: (residentUid: string, id: string) => store.markNotificationRead(residentUid, id),
    getPreferences: async (residentUid: string) => await store.getPreferences(residentUid) ?? defaults,
    setPreferences: (residentUid: string, preferences: NotificationPreferences) => store.setPreferences(residentUid, preferences),
  };
}

export function createMemoryEngagementStore(seed: { reports?: SuggestionReport[] } = {}): EngagementStore {
  const states = new Map<string, ResidentReportState>();
  const notifications = new Map<string, ResidentNotification>();
  const preferences = new Map<string, NotificationPreferences>();
  const stateKey = (residentUid: string, reference: string) => `${residentUid}:${reference}`;
  return {
    async listSuggestionReports() { return seed.reports ?? []; },
    async getResidentState(residentUid, reference) { return states.get(stateKey(residentUid, reference)) ?? emptyState(); },
    async setResidentState(residentUid, reference, state) { states.set(stateKey(residentUid, reference), state); },
    async addNotificationOnce(key, notification) { if (!notifications.has(key)) notifications.set(key, notification); },
    async listNotifications(residentUid) { return [...notifications.values()].filter((notice) => notice.residentUid === residentUid).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    async markNotificationRead(residentUid, id) {
      for (const [key, notice] of notifications) if (notice.id === id && notice.residentUid === residentUid) notifications.set(key, { ...notice, read: true });
    },
    async getPreferences(residentUid) { return preferences.get(residentUid) ?? null; },
    async setPreferences(residentUid, value) { preferences.set(residentUid, value); },
  };
}
