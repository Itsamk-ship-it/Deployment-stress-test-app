"use client";

import { useState } from "react";
import { Out, useAction, api } from "./shared";

export default function CachePanel() {
  const [key, setKey] = useState("greeting");
  const [value, setValue] = useState("hello from redis");
  const [ttl, setTtl] = useState("60");
  const { loading, result, error, run } = useAction();

  const set = () =>
    run(() =>
      api("/api/cache", {
        method: "POST",
        body: JSON.stringify({ key, value, ttlSeconds: ttl ? Number(ttl) : undefined }),
      }),
    );
  const get = () => run(() => api(`/api/cache?key=${encodeURIComponent(key)}`));
  const del = () => run(() => api(`/api/cache?key=${encodeURIComponent(key)}`, { method: "DELETE" }));

  return (
    <div className="card">
      <h2>⚡ Redis cache</h2>
      <p className="desc">Set / get / delete keys in Redis with an optional TTL.</p>
      <label>Key</label>
      <input value={key} onChange={(e) => setKey(e.target.value)} />
      <label>Value</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <label>TTL seconds (optional)</label>
      <input value={ttl} onChange={(e) => setTtl(e.target.value)} type="number" />
      <div className="row">
        <button onClick={set} disabled={loading}>Set</button>
        <button className="secondary" onClick={get} disabled={loading}>Get</button>
        <button className="secondary" onClick={del} disabled={loading}>Delete</button>
      </div>
      {error && <Out data={`Error: ${error}`} />}
      {result != null && <Out data={result} />}
    </div>
  );
}
