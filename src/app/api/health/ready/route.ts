import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Readiness probe: verifies the app can reach its critical dependencies
// (Postgres + Redis). Returns 503 if any dependency is unreachable so the
// platform keeps the instance out of rotation until it recovers.
export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  await Promise.all([
    timed(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }).then((r) => (checks.postgres = r)),
    timed(async () => {
      const pong = await redis.ping();
      if (pong !== "PONG") throw new Error(`unexpected ping reply: ${pong}`);
    }).then((r) => (checks.redis = r)),
  ]);

  const healthy = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { status: healthy ? "ready" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}

async function timed(fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}
