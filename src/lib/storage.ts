import { createHash } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { env } from "./env";

function uploadRoot(): string {
  return path.resolve(env.uploadDir);
}

export interface StoredFile {
  storedName: string;
  sizeBytes: number;
  checksum: string;
}

// Persists a buffer to the upload directory and returns its metadata.
// In a real deployment this would target S3/GCS; local disk keeps the demo
// self-contained while still exercising the "file upload" code path.
export async function storeFile(originalName: string, data: Buffer): Promise<StoredFile> {
  await mkdir(uploadRoot(), { recursive: true });
  const ext = path.extname(originalName);
  const storedName = `${Date.now()}-${nanoid(10)}${ext}`;
  const checksum = createHash("sha256").update(data).digest("hex");
  await writeFile(path.join(uploadRoot(), storedName), data);
  return { storedName, sizeBytes: data.length, checksum };
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  // Guard against path traversal — only allow a bare filename.
  const safe = path.basename(storedName);
  return readFile(path.join(uploadRoot(), safe));
}

export async function deleteStoredFile(storedName: string): Promise<void> {
  const safe = path.basename(storedName);
  await unlink(path.join(uploadRoot(), safe)).catch(() => {});
}
