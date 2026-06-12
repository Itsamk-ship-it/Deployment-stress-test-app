"use client";

import { useCallback, useState } from "react";

export function Out({ data }: { data: unknown }) {
  if (data === undefined || data === null) return null;
  return <pre className="out">{typeof data === "string" ? data : JSON.stringify(data, null, 2)}</pre>;
}

// Tiny helper: tracks loading state + last response for an async action.
export function useAction<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fn();
      setResult(r);
      return r;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, result, error, run, setResult };
}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}
