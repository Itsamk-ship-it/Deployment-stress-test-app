import { createHmac, timingSafeEqual } from "crypto";

// HMAC-SHA256 signing used for both incoming verification and outgoing delivery.
export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const SIGNATURE_HEADER = "x-webhook-signature";
