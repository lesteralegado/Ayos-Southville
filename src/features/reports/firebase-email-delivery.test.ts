// @vitest-environment node
import { vi } from "vitest";
const state = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), consent: true }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/session", () => ({ hasPilotEligibility: async () => true }));
vi.mock("@/lib/firebase/admin", () => {
  const doc = (key: string) => ({ key, get: async () => ({ data: () => structuredClone(state.records.get(key)) }) });
  const query = (name: string) => {
    let field = "", value = "", limit = 20;
    const result = { where: (f: string, _op: string, v: string) => { field = f; value = v; return result; }, orderBy: () => result, limit: (n: number) => { limit = n; return result; },
      get: async () => ({ docs: [...state.records].filter(([key, data]) => key.startsWith(name + "/") && (!field || String(data[field]) <= value)).sort((a,b) => String(a[1][field]).localeCompare(String(b[1][field]))).slice(0,limit).map(([key,data]) => ({ id: key.split("/")[1], data: () => structuredClone(data) })) }), doc: (id: string) => doc(name + "/" + id) };
    return result;
  };
  return { getFirebaseAdmin: () => ({ auth: { getUser: async (uid: string) => ({ uid, emailVerified: true, email: "resident@example.test", disabled: false }) }, db: { collection: query,
    runTransaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation({ get: (ref: ReturnType<typeof doc>) => ref.get(), update: (ref: ReturnType<typeof doc>, data: Record<string, unknown>) => state.records.set(ref.key, { ...state.records.get(ref.key), ...structuredClone(data) }) }) } }) };
});
import { getEmailDeliveryModule } from "./firebase-email-delivery";
beforeEach(() => {
  state.records.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
  vi.stubEnv("RESEND_SENDER_VERIFIED", "true"); vi.stubEnv("RESEND_API_KEY", "test-only"); vi.stubEnv("RESEND_FROM", "pilot@example.test"); vi.stubEnv("APP_SITE_URL", "https://pilot.example.test");
  state.records.set("notificationPreferences/resident", { emailEnabled: true, statusUpdates: true });
  state.records.set("lifecycleEmailJobs/notice-1", { id: "notice-1", residentUid: "resident", reference: "AS-400001", audience: "status", createdAt: new Date().toISOString(), nextAttemptAt: new Date().toISOString(), status: "pending" });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("recovers provider failure through persisted work without resending completed email", async () => {
  const messages: { key: string | null; body: string }[] = []; let healthy = false;
  vi.stubGlobal("fetch", async (_url: string, input: RequestInit) => { messages.push({ key: new Headers(input.headers).get("idempotency-key"), body: String(input.body) }); return healthy ? Response.json({ id: "provider-1" }) : new Response("Unavailable", { status: 503 }); });
  expect(await getEmailDeliveryModule().run()).toMatchObject({ retried: 1 });
  healthy = true; vi.setSystemTime(new Date("2026-10-11T00:10:00Z"));
  expect(await getEmailDeliveryModule().run()).toMatchObject({ sent: 1 });
  expect(await getEmailDeliveryModule().run()).toMatchObject({ sent: 0 });
  expect(messages.map(message => message.key)).toEqual(["lifecycle/notice-1", "lifecycle/notice-1"]);
  expect(messages[1].body).toBe(messages[0].body);
});
it("rechecks consent and fails closed before sending when sender verification is absent", async () => {
  const messages: string[] = []; vi.stubGlobal("fetch", async () => { messages.push("sent"); return Response.json({ id: "provider-1" }); });
  state.records.set("notificationPreferences/resident", { emailEnabled: false, statusUpdates: true });
  expect(await getEmailDeliveryModule().run()).toMatchObject({ skipped: 1 }); expect(messages).toEqual([]);
  vi.stubEnv("RESEND_SENDER_VERIFIED", "false"); expect(() => getEmailDeliveryModule()).toThrow("Verified");
});
