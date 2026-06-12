import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Synchronous stress endpoint for poking at a platform's CPU/latency limits.
//   /api/stress?mode=cpu&ms=500
//   /api/stress?mode=latency&ms=2000
//   /api/stress?mode=memory&mb=50
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "cpu";
  const start = Date.now();

  if (mode === "latency") {
    const ms = clamp(Number(url.searchParams.get("ms") ?? 1000), 0, 30000);
    await new Promise((r) => setTimeout(r, ms));
    return NextResponse.json({ mode, requestedMs: ms, elapsedMs: Date.now() - start });
  }

  if (mode === "memory") {
    const mb = clamp(Number(url.searchParams.get("mb") ?? 50), 1, 512);
    const blocks: Buffer[] = [];
    for (let i = 0; i < mb; i++) blocks.push(Buffer.alloc(1024 * 1024, 1));
    const total = blocks.reduce((n, b) => n + b.length, 0);
    return NextResponse.json({ mode, allocatedMb: total / (1024 * 1024), elapsedMs: Date.now() - start });
  }

  // Default: busy-hash for a bounded duration to burn CPU.
  const ms = clamp(Number(url.searchParams.get("ms") ?? 500), 0, 10000);
  let iterations = 0;
  let hash = "seed";
  while (Date.now() - start < ms) {
    hash = createHash("sha256").update(hash).digest("hex");
    iterations++;
  }
  return NextResponse.json({ mode: "cpu", requestedMs: ms, iterations, elapsedMs: Date.now() - start });
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
