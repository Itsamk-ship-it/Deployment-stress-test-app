import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { enqueueJob, JOBS_QUEUE, type JobType } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List recent job records.
export async function GET() {
  const jobs = await prisma.jobRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ jobs });
}

const schema = z.object({
  type: z.enum(["cpu-burn", "sleep", "send-email", "deliver-webhook", "process-upload"]),
  payload: z.record(z.unknown()).optional().default({}),
  delayMs: z.number().int().nonnegative().optional(),
});

// Enqueue an arbitrary background job. Used to stress-test the worker / Redis.
export async function POST(req: Request) {
  const session = await getSession();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { type, payload, delayMs } = parsed.data;

  const record = await prisma.jobRecord.create({
    data: {
      userId: session?.sub,
      queue: JOBS_QUEUE,
      type,
      status: "queued",
      payload: payload as object,
    },
  });

  await enqueueJob({ type: type as JobType, jobRecordId: record.id, payload }, { delayMs });
  await logger.info("Job enqueued", { jobRecordId: record.id, type }, "jobs");

  return NextResponse.json({ job: record });
}
