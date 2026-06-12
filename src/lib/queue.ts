import { Queue, type ConnectionOptions } from "bullmq";
import { createRedisConnection } from "./redis";

// BullMQ bundles its own copy of ioredis; the structural types differ from the
// app's ioredis even though they're identical at runtime, so we cast here.
const connection = createRedisConnection() as unknown as ConnectionOptions;

// A single multipurpose queue. The `type` field on each job decides what the
// worker does. This keeps the stress-test surface small but exercises real
// Redis-backed background processing.
export const JOBS_QUEUE = "jobs";

export type JobType =
  | "send-email"
  | "deliver-webhook"
  | "cpu-burn"
  | "sleep"
  | "process-upload";

export interface JobData {
  type: JobType;
  jobRecordId?: string;
  payload: Record<string, unknown>;
}

function buildQueue() {
  return new Queue<JobData>(JOBS_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

const globalForQueue = globalThis as unknown as { jobsQueue?: ReturnType<typeof buildQueue> };

export const jobsQueue = globalForQueue.jobsQueue ?? buildQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.jobsQueue = jobsQueue;
}

export async function enqueueJob(data: JobData, opts?: { delayMs?: number }) {
  return jobsQueue.add(data.type, data, {
    delay: opts?.delayMs,
  });
}
