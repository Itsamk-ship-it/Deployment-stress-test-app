"use client";

import { useEffect, useState } from "react";
import { Out } from "./shared";

interface ReadyResp {
  status: string;
  checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
}

export default function HealthPanel() {
  const [ready, setReady] = useState<ReadyResp | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    const res = await fetch("/api/health/ready");
    setReady(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card">
      <h2>
        ❤️ Health checks
        {ready && (
          <span className={`badge ${ready.status === "ready" ? "ok" : "err"}`}>{ready.status}</span>
        )}
      </h2>
      <p className="desc">
        Liveness: <span className="mono">/api/health</span> · Readiness:{" "}
        <span className="mono">/api/health/ready</span>
      </p>
      {ready && (
        <table>
          <tbody>
            {Object.entries(ready.checks).map(([name, c]) => (
              <tr key={name}>
                <td className="mono">{name}</td>
                <td>
                  <span className={`badge ${c.ok ? "ok" : "err"}`}>{c.ok ? "up" : "down"}</span>
                </td>
                <td className="muted">{c.latencyMs != null ? `${c.latencyMs}ms` : c.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="secondary" onClick={check} disabled={loading}>
        {loading ? "Checking…" : "Re-check now"}
      </button>
    </div>
  );
}
