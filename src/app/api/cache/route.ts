import { NextResponse } from "next/server";
import { z } from "zod";
import { cacheGet, cacheSet, cacheDel, redis } from "@/lib/redis";

export const runtime = "nodejs";

// GET /api/cache?key=foo  -> read a value (and a small Redis info summary)
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) {
    const dbsize = await redis.dbsize();
    return NextResponse.json({ keys: dbsize });
  }
  const value = await cacheGet(key);
  const ttl = await redis.ttl(key);
  return NextResponse.json({ key, value, ttl });
}

const setSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  ttlSeconds: z.number().int().positive().optional(),
});

// POST /api/cache  { key, value, ttlSeconds? } -> write a value
export async function POST(req: Request) {
  const parsed = setSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { key, value, ttlSeconds } = parsed.data;
  await cacheSet(key, value, ttlSeconds);
  return NextResponse.json({ ok: true, key, ttlSeconds: ttlSeconds ?? null });
}

// DELETE /api/cache?key=foo -> delete a key
export async function DELETE(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const removed = await cacheDel(key);
  return NextResponse.json({ ok: true, removed });
}
