import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifySignature, SIGNATURE_HEADER } from "@/lib/webhooks";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Receives inbound webhooks from external systems. The raw body is verified
// against an HMAC-SHA256 signature using WEBHOOK_SECRET before processing.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER) ?? "";

  if (!verifySignature(env.webhookSecret, raw, signature)) {
    await logger.warn("Rejected webhook: bad signature", { signature }, "webhooks");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await logger.info("Inbound webhook received", { payload }, "webhooks");
  return NextResponse.json({ ok: true, received: true });
}
