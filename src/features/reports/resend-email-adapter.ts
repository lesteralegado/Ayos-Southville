import "server-only";
import { EmailDeliveryError, type EmailAdapter } from "./email-delivery-module";

export function createResendEmailAdapter({ apiKey, from, request = fetch }: { apiKey: string; from: string; request?: typeof fetch }): EmailAdapter {
  if (!apiKey || !from || /[\r\n]/.test(from)) throw new Error("Email configuration is incomplete.");
  return { async send(email) {
    const response = await request("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `lifecycle/${email.id}` },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text }),
    });
    if (!response.ok) throw new EmailDeliveryError(response.status >= 500 || [409, 429].includes(response.status));
    const body = await response.json() as { id?: string };
    if (!body.id) throw new EmailDeliveryError(true);
    return body.id;
  } };
}
