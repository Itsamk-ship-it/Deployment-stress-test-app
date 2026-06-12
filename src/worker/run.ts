import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { createHash } from "crypto";
import { createRedisConnection } from "../lib/redis";
import { JOBS_QUEUE, type JobData } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";
import { signPayload, SIGNATURE_HEADER } from "../lib/webhooks";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

// The worker is a standalone Node process (run separately from the web server)
// that drains the shared BullMQ queue. This mirrors how deployment platforms
// run a dedicated "worker" dyno/service alongside the web service.

async function handle(job: Job<JobData>): Promise<unknown> {
  const { type, jobRecordId, payload } = job.data;

  if (jobRecordId) {
    await prisma.jobRecord
      .update({ where: { id: jobRecordId }, data: { status: "active", startedAt: new Date() } })
      .catch(() => {});
  }

  switch (type) {
    case "send-email":
      return processEmail(payload);
    case "deliver-webhook":
      return deliverWebhook(payload);
    case "process-upload":
      return processUpload(payload);
    case "cpu-burn":
      return cpuBurn(payload);
    case "sleep":
      return sleep(payload);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function processEmail(payload: Record<string, unknown>) {
  const emailId = String(payload.emailId);
  const email = await prisma.emailMessage.findUnique({ where: { id: emailId } });
  if (!email) throw new Error(`Email ${emailId} not found`);
  try {
    const result = await sendEmail({ to: email.to, subject: email.subject, body: email.body });
    await prisma.emailMessage.update({
      where: { id: emailId },
      data: { status: "sent", sentAt: new Date() },
    });
    return result;
  } catch (err) {
    await prisma.emailMessage.update({
      where: { id: emailId },
      data: { status: "failed", error: (err as Error).message },
    });
    throw err;
  }
}

async function deliverWebhook(payload: Record<string, unknown>) {
  const deliveryId = String(payload.deliveryId);
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery) throw new Error(`Delivery ${deliveryId} not found`);

  const body = JSON.stringify(delivery.payload);
  const signature = signPayload(delivery.endpoint.secret, body);

  try {
    const res = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: signature },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const ok = res.ok;
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: ok ? "success" : "failed",
        responseCode: res.status,
        attempts: { increment: 1 },
        deliveredAt: ok ? new Date() : null,
        lastError: ok ? null : `HTTP ${res.status}`,
      },
    });
    if (!ok) throw new Error(`Webhook returned HTTP ${res.status}`);
    return { status: res.status };
  } catch (err) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", attempts: { increment: 1 }, lastError: (err as Error).message },
    });
    throw err;
  }
}

async function processUpload(payload: Record<string, unknown>) {
  // Simulate post-processing (thumbnailing, virus scan, etc.).
  const uploadId = String(payload.uploadId);
  const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
  if (!upload) throw new Error(`Upload ${uploadId} not found`);
  await new Promise((r) => setTimeout(r, 500));
  return { uploadId, processed: true, checksum: upload.checksum };
}

async function cpuBurn(payload: Record<string, unknown>) {
  const ms = Math.min(Number(payload.ms ?? 1000), 30000);
  const start = Date.now();
  let hash = "seed";
  let iterations = 0;
  while (Date.now() - start < ms) {
    hash = createHash("sha256").update(hash).digest("hex");
    iterations++;
  }
  return { iterations, elapsedMs: Date.now() - start };
}

async function sleep(payload: Record<string, unknown>) {
  const ms = Math.min(Number(payload.ms ?? 1000), 60000);
  await new Promise((r) => setTimeout(r, ms));
  return { sleptMs: ms };
}

const worker = new Worker<JobData>(JOBS_QUEUE, handle, {
  // Cast for the same bundled-ioredis type mismatch noted in lib/queue.ts.
  connection: createRedisConnection() as unknown as ConnectionOptions,
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
});

worker.on("completed", async (job, result) => {
  const id = job.data.jobRecordId;
  if (id) {
    await prisma.jobRecord
      .update({
        where: { id },
        data: { status: "completed", finishedAt: new Date(), result: (result ?? {}) as object },
      })
      .catch(() => {});
  }
  await logger.info("Job completed", { jobId: job.id, type: job.data.type }, "worker");
});

worker.on("failed", async (job, err) => {
  const id = job?.data.jobRecordId;
  if (id) {
    await prisma.jobRecord
      .update({ where: { id }, data: { status: "failed", finishedAt: new Date(), error: err.message } })
      .catch(() => {});
  }
  await logger.error("Job failed", { jobId: job?.id, type: job?.data.type, error: err.message }, "worker");
});

// eslint-disable-next-line no-console
console.log(`[worker] listening on queue "${JOBS_QUEUE}" (redis: ${env.redisUrl})`);

async function shutdown() {
  // eslint-disable-next-line no-console
  console.log("[worker] shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
