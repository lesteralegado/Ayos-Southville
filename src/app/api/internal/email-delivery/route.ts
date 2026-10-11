import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getEmailDeliveryModule } from "@/features/reports/firebase-email-delivery";

export const maxDuration = 120;
export async function POST(request: Request) {
  const secret = process.env.EMAIL_DELIVERY_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const headers = { "Cache-Control": "no-store" };
  if (!secret || secret.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try { return NextResponse.json(await getEmailDeliveryModule().run(), { headers }); }
  catch { return NextResponse.json({ error: "Email delivery is unavailable. Check server configuration and retry." }, { status: 503, headers }); }
}
