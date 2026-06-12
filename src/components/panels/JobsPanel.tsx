"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction, api } from "./shared";

interface JobRecord {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  queued: "warn",
  active: "warn",
  completed: "ok",
  failed: "err",
};

export default function JobsPanel({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [type, setType] = useState("cpu-burn");
  const [ms, setMs] = useState("1500");
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const { loading, run } = useAction();

  const load = useCallback(async () => {
    const data = await api<{ jobs: JobRecord[] }>("/api/jobs");
    setJobs(data.jobs);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load, refreshKey]);

  const enqueue = () =>
    run(async () => {
      await api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ type, payload: { ms: Number(ms) } }),
      });
      await load();
      onChange();
    });

  return (
    <div className="card">
      <h2>⚙️ Background jobs</h2>
      <p className="desc">Enqueue BullMQ jobs processed by the worker process.</p>
      <label>Job type</label>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="cpu-burn">cpu-burn</option>
        <option value="sleep">sleep</option>
      </select>
      <label>Duration ms</label>
      <input value={ms} onChange={(e) => setMs(e.target.value)} type="number" />
      <button onClick={enqueue} disabled={loading}>{loading ? "Enqueuing…" : "Enqueue job"}</button>
      <table style={{ marginTop: 12 }}>
        <thead>
          <tr><th>Type</th><th>Status</th><th>When</th></tr>
        </thead>
        <tbody>
          {jobs.slice(0, 8).map((j) => (
            <tr key={j.id}>
              <td className="mono">{j.type}</td>
              <td><span className={`badge ${STATUS_CLASS[j.status] ?? "warn"}`}>{j.status}</span></td>
              <td className="muted">{new Date(j.createdAt).toLocaleTimeString()}</td>
            </tr>
          ))}
          {jobs.length === 0 && <tr><td colSpan={3} className="muted">No jobs yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
