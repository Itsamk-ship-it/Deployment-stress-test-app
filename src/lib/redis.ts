import IORedis, { type Redis } from "ioredis";
import { env } from "./env";

// Shared Redis connection for general cache usage.
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis: Redis =
  globalForRedis.redis ??
  new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// BullMQ requires a dedicated connection with `maxRetriesPerRequest: null`.
// We expose a factory so queue/worker each get their own connection.
export function createRedisConnection(): Redis {
  return new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
}

// --- Small cache helpers used by the /api/cache route and elsewhere ---

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const raw = JSON.stringify(value);
  if (ttlSeconds && ttlSeconds > 0) {
    await redis.set(key, raw, "EX", ttlSeconds);
  } else {
    await redis.set(key, raw);
  }
}

export async function cacheDel(key: string): Promise<number> {
  return redis.del(key);
}
