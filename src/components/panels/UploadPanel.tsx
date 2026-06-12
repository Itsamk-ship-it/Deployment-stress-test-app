"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./shared";

interface Upload {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

export default function UploadPanel({ onChange }: { onChange: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ uploads: Upload[] }>("/api/uploads");
    setUploads(data.uploads);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    await load();
    onChange();
  }

  return (
    <div className="card">
      <h2>📁 File uploads</h2>
      <p className="desc">Uploads to disk + DB metadata, then queues a process-upload job.</p>
      <input ref={fileRef} type="file" />
      <button onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      {error && <p className="level-error" style={{ fontSize: 12 }}>{error}</p>}
      <table style={{ marginTop: 12 }}>
        <thead><tr><th>Name</th><th>Size</th><th></th></tr></thead>
        <tbody>
          {uploads.slice(0, 6).map((u) => (
            <tr key={u.id}>
              <td className="mono">{u.originalName}</td>
              <td className="muted">{(u.sizeBytes / 1024).toFixed(1)} KB</td>
              <td><a href={`/api/uploads/${u.id}`}>download</a></td>
            </tr>
          ))}
          {uploads.length === 0 && <tr><td colSpan={3} className="muted">No uploads yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
