import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger, type LogLevel } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/logs?level=error&source=app&limit=100 -> recent log entries
export async function GET(req: Request) {
  const url = new URL(req.url);
  const level = url.searchParams.get("level") ?? undefined;
  const source = url.searchParams.get("source") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  const logs = await prisma.logEntry.findMany({
    where: { level: level || undefined, source: source || undefined },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}

// POST /api/logs { level, message, context? } -> emit a log line (test helper)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const level = (body.level as LogLevel) || "info";
  const message = String(body.message ?? "test log entry");
  await logger[level](message, body.context, "api");
  return NextResponse.json({ ok: true });
}
