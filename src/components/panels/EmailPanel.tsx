"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction, api } from "./shared";

interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function EmailPanel({ onChange }: { onChange: () => void }) {
  const [to, setTo] = useState("recipient@example.com");
  const [subject, setSubject] = useState("Hello from the stress test");
  const [body, setBody] = useState("This email was queued and sent by a background job.");
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const { loading, run } = useAction();

  const load = useCallback(async () => {
    const data = await api<{ emails: EmailMessage[] }>("/api/email");
    setEmails(data.emails);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const send = () =>
    run(async () => {
      await api("/api/email", { method: "POST", body: JSON.stringify({ to, subject, body }) });
      await load();
      onChange();
    });

  return (
    <div className="card">
      <h2>✉️ Email</h2>
      <p className="desc">Queues an email; the worker sends it via SMTP (or a logging transport).</p>
      <label>To</label>
      <input value={to} onChange={(e) => setTo(e.target.value)} type="email" />
      <label>Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label>Body</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      <button onClick={send} disabled={loading}>{loading ? "Queuing…" : "Queue email"}</button>
      <table style={{ marginTop: 12 }}>
        <thead><tr><th>To</th><th>Status</th></tr></thead>
        <tbody>
          {emails.slice(0, 6).map((m) => (
            <tr key={m.id}>
              <td className="mono">{m.to}</td>
              <td>
                <span className={`badge ${m.status === "sent" ? "ok" : m.status === "failed" ? "err" : "warn"}`}>
                  {m.status}
                </span>
              </td>
            </tr>
          ))}
          {emails.length === 0 && <tr><td colSpan={2} className="muted">No emails yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
