import { useCallback, useEffect, useState } from "react";

export type TryOnHistoryEntry = {
  id: string;
  createdAt: number;
  beforeUrl: string;   // data URL
  afterUrl: string;    // signed URL (may expire but usually valid ~1h)
  label: string;
  category?: string;
  sourceUrl?: string;  // original pasted product link
};

const KEY_PREFIX = "tryon:history:";
const MAX_ENTRIES = 20;

const keyFor = (userId?: string | null) => `${KEY_PREFIX}${userId ?? "anon"}`;

export function useTryOnHistory(userId?: string | null) {
  const [history, setHistory] = useState<TryOnHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(userId));
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
  }, [userId]);

  const persist = useCallback((next: TryOnHistoryEntry[]) => {
    setHistory(next);
    try { localStorage.setItem(keyFor(userId), JSON.stringify(next)); } catch {}
  }, [userId]);

  const add = useCallback((entry: Omit<TryOnHistoryEntry, "id" | "createdAt">) => {
    const full: TryOnHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    const next = [full, ...history].slice(0, MAX_ENTRIES);
    persist(next);
    return full;
  }, [history, persist]);

  const remove = useCallback((id: string) => {
    persist(history.filter((h) => h.id !== id));
  }, [history, persist]);

  const clear = useCallback(() => persist([]), [persist]);

  return { history, add, remove, clear };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}
