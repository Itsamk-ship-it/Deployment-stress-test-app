import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  eventType: z.string().min(1),
  data: z.record(z.unknown()).optional().default({}),
});

// Fire an event: create a pending delivery for each matching active endpoint
// and enqueue a background job to POST the signed payload to it.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { eventType, data } = parsed.data;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { eventType, active: true },
  });

  const deliveries = await Promise.all(
    endpoints.map(async (endpoint) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventType,
          payload: { event: eventType, data, timestamp: new Date().toISOString() } as object,
        },
      });
      await enqueueJob({ type: "deliver-webhook", payload: { deliveryId: delivery.id } });
      return delivery.id;
    }),
  );

  await logger.info("Webhook event triggered", { eventType, count: deliveries.length }, "webhooks");
  return NextResponse.json({ eventType, queued: deliveries.length, deliveryIds: deliveries });
}
