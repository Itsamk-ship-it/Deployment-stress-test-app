"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./shared";

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  createdAt: string;
}

export default function LogsPanel({ refreshKey }: { refreshKey: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState("");

  const load = useCallback(async () => {
    const q = level ? `?level=${level}` : "";
    const data = await api<{ logs: LogEntry[] }>(`/api/logs${q}`);
    setLogs(data.logs);
  }, [level]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load, refreshKey]);

  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <h2>📜 Logs dashboard</h2>
      <p className="desc">Structured logs persisted to Postgres and streamed to stdout.</p>
      <div className="row" style={{ alignItems: "center" }}>
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">all levels</option>
          <option value="debug">debug</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <button className="secondary" onClick={load} style={{ maxWidth: 120 }}>Refresh</button>
      </div>
      <table style={{ marginTop: 12 }}>
        <thead>
          <tr><th style={{ width: 90 }}>Time</th><th style={{ width: 60 }}>Level</th><th style={{ width: 90 }}>Source</th><th>Message</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="muted mono">{new Date(l.createdAt).toLocaleTimeString()}</td>
              <td className={`level-${l.level}`}>{l.level}</td>
              <td className="mono muted">{l.source}</td>
              <td>{l.message}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={4} className="muted">No logs yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
