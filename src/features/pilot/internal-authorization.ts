import { timingSafeEqual } from "node:crypto";
export function workerAuthorized(request: Request, secret: string | undefined) {
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") ?? "", expected = `Bearer ${secret}`;
  return Buffer.byteLength(supplied) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
