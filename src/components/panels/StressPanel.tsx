"use client";

import { useState } from "react";
import { Out, useAction, api } from "./shared";

export default function StressPanel() {
  const [mode, setMode] = useState("cpu");
  const [amount, setAmount] = useState("500");
  const { loading, result, error, run } = useAction();

  const fire = () =>
    run(() => {
      const param = mode === "memory" ? `mb=${amount}` : `ms=${amount}`;
      return api(`/api/stress?mode=${mode}&${param}`);
    });

  return (
    <div className="card">
      <h2>🔥 Stress endpoint</h2>
      <p className="desc">Burn CPU, hold memory, or add latency to probe platform limits.</p>
      <label>Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="cpu">cpu (ms)</option>
        <option value="latency">latency (ms)</option>
        <option value="memory">memory (mb)</option>
      </select>
      <label>{mode === "memory" ? "Megabytes" : "Milliseconds"}</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
      <button onClick={fire} disabled={loading}>{loading ? "Running…" : "Run"}</button>
      {error && <Out data={`Error: ${error}`} />}
      {result != null && <Out data={result} />}
    </div>
  );
}
