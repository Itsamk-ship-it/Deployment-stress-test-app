"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction, api } from "./shared";

interface Endpoint { id: string; url: string; eventType: string; active: boolean; }
interface Delivery { id: string; eventType: string; status: string; responseCode: number | null; }

export default function WebhookPanel({ onChange }: { onChange: () => void }) {
  const [url, setUrl] = useState("https://httpbin.org/post");
  const [eventType, setEventType] = useState("test.event");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const { loading, run } = useAction();

  const load = useCallback(async () => {
    const data = await api<{ endpoints: Endpoint[]; deliveries: Delivery[] }>("/api/webhooks");
    setEndpoints(data.endpoints);
    setDeliveries(data.deliveries);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const register = () =>
    run(async () => {
      await api("/api/webhooks", { method: "POST", body: JSON.stringify({ url, eventType }) });
      await load();
    });

  const trigger = () =>
    run(async () => {
      await api("/api/webhooks/trigger", {
        method: "POST",
        body: JSON.stringify({ eventType, data: { hello: "world", at: Date.now() } }),
      });
      await load();
      onChange();
    });

  return (
    <div className="card">
      <h2>🪝 Webhooks</h2>
      <p className="desc">Register outgoing endpoints, then fire an event. The worker delivers signed payloads.</p>
      <label>Endpoint URL</label>
      <input value={url} onChange={(e) => setUrl(e.target.value)} />
      <label>Event type</label>
      <input value={eventType} onChange={(e) => setEventType(e.target.value)} />
      <div className="row">
        <button className="secondary" onClick={register} disabled={loading}>Register endpoint</button>
        <button onClick={trigger} disabled={loading}>Fire event</button>
      </div>
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        {endpoints.length} endpoint(s) registered. Inbound URL: <span className="mono">/api/webhooks/incoming</span>
      </p>
      <table>
        <thead><tr><th>Event</th><th>Status</th><th>Code</th></tr></thead>
        <tbody>
          {deliveries.slice(0, 6).map((d) => (
            <tr key={d.id}>
              <td className="mono">{d.eventType}</td>
              <td><span className={`badge ${d.status === "success" ? "ok" : d.status === "failed" ? "err" : "warn"}`}>{d.status}</span></td>
              <td className="muted">{d.responseCode ?? "—"}</td>
            </tr>
          ))}
          {deliveries.length === 0 && <tr><td colSpan={3} className="muted">No deliveries yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
