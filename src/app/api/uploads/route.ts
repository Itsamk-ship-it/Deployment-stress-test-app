import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { storeFile } from "@/lib/storage";
import { enqueueJob } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// List recent uploads.
export async function GET() {
  const uploads = await prisma.upload.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ uploads });
}

// Accept a multipart file upload, persist it to storage + DB, and queue a
// background "process-upload" job.
export async function POST(req: Request) {
  const session = await getSession();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a 'file' field" }, { status: 400 });
  }
  if (file.size > env.maxUploadBytes) {
    return NextResponse.json({ error: "File too large", maxBytes: env.maxUploadBytes }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeFile(file.name, buffer);

  const upload = await prisma.upload.create({
    data: {
      userId: session?.sub,
      originalName: file.name,
      storedName: stored.storedName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: stored.sizeBytes,
      checksum: stored.checksum,
    },
  });

  await enqueueJob({ type: "process-upload", payload: { uploadId: upload.id } });
  await logger.info("File uploaded", { uploadId: upload.id, size: stored.sizeBytes }, "uploads");

  return NextResponse.json({ upload });
}
