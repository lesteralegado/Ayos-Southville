// @vitest-environment node
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createResendEmailAdapter } from "./resend-email-adapter";
import { EmailDeliveryError } from "./email-delivery-module";
it("uses a stable provider key and sends only the supplied privacy-safe payload", async () => {
  const received: Request[] = [];
  const adapter = createResendEmailAdapter({ apiKey: "test-only", from: "pilot@example.test", request: async (url, input) => { received.push(new Request(url, input)); return Response.json({ id: "provider-1" }); } });
  const email = { id: "notice-1", to: "resident@example.test", subject: "Report update", text: "Sign in to read your notifications." };
  expect(await adapter.send(email)).toBe("provider-1"); expect(await adapter.send(email)).toBe("provider-1");
  expect(received.map(request => request.headers.get("idempotency-key"))).toEqual(["lifecycle/notice-1", "lifecycle/notice-1"]);
  expect(await received[0].json()).toEqual({ from: "pilot@example.test", to: ["resident@example.test"], subject: "Report update", text: "Sign in to read your notifications." });
});
it.each([[429,true],[503,true],[422,false]])("classifies provider %s without exposing its response body", async (status, retryable) => {
  const adapter = createResendEmailAdapter({ apiKey: "test-only", from: "pilot@example.test", request: async () => new Response("secret provider details", { status: Number(status) }) });
  await expect(adapter.send({ id: "notice", to: "resident@example.test", subject: "Update", text: "Sign in." })).rejects.toEqual(new EmailDeliveryError(Boolean(retryable)));
});
