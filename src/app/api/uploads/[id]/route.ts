import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile, deleteStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

// Download an uploaded file by id.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const upload = await prisma.upload.findUnique({ where: { id: params.id } });
  if (!upload) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = await readStoredFile(upload.storedName);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Disposition": `attachment; filename="${upload.originalName}"`,
        "Content-Length": String(upload.sizeBytes),
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 410 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const upload = await prisma.upload.findUnique({ where: { id: params.id } });
  if (!upload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteStoredFile(upload.storedName);
  await prisma.upload.delete({ where: { id: upload.id } });
  return NextResponse.json({ ok: true });
}
