// @vitest-environment node
import { vi } from "vitest";
vi.mock("@/features/reports/firebase-email-delivery", () => ({ getEmailDeliveryModule: () => ({ run: async () => ({ sent: 1, retried: 0, skipped: 0, review: 0 }) }) }));
import { POST } from "./route";
afterEach(() => vi.unstubAllEnvs());
it("denies an absent or incorrect worker secret and returns only aggregate counts", async () => {
  vi.stubEnv("EMAIL_DELIVERY_SECRET", "test-secret-123456789012345678901234567890");
  expect((await POST(new Request("https://ayos.test/api/internal/email-delivery", { method: "POST" }))).status).toBe(401);
  expect((await POST(new Request("https://ayos.test/api/internal/email-delivery", { method: "POST", headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
  const response = await POST(new Request("https://ayos.test/api/internal/email-delivery", { method: "POST", headers: { authorization: "Bearer test-secret-123456789012345678901234567890" } }));
  expect(response.headers.get("cache-control")).toBe("no-store"); expect(await response.json()).toEqual({ sent: 1, retried: 0, skipped: 0, review: 0 });
});
