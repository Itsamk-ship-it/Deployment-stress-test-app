import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// List configured outgoing webhook endpoints + recent deliveries.
export async function GET() {
  const [endpoints, deliveries] = await Promise.all([
    prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.webhookDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return NextResponse.json({ endpoints, deliveries });
}

const schema = z.object({
  url: z.string().url(),
  eventType: z.string().min(1).default("test.event"),
});

// Register an outgoing webhook endpoint.
export async function POST(req: Request) {
  const session = await getSession();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      userId: session?.sub,
      url: parsed.data.url,
      eventType: parsed.data.eventType,
      secret: nanoid(32),
    },
  });
  return NextResponse.json({ endpoint });
}
