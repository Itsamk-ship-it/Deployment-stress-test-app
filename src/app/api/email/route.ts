import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// List recently sent/queued emails.
export async function GET() {
  const emails = await prisma.emailMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ emails });
}

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  async: z.boolean().optional().default(true),
});

// Queue (or, with async:false, immediately enqueue) an email send. The actual
// SMTP send happens in the background worker.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { to, subject, body } = parsed.data;

  const email = await prisma.emailMessage.create({
    data: { to, subject, body, status: "queued" },
  });

  await enqueueJob({ type: "send-email", payload: { emailId: email.id } });
  await logger.info("Email queued", { emailId: email.id, to }, "email");

  return NextResponse.json({ email });
}
