"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "brimmybuddy:recent";
// Same-tab notifications: the native "storage" event only fires in *other*
// tabs, so we broadcast a custom event to keep every hook instance in sync.
const EVENT = "brimmybuddy:recentchange";
// Cap the history so localStorage stays small and the list stays useful.
const MAX = 40;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode / quota) — non-critical.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Record that a lineup was just viewed. Moves it to the front (most recent) and
 * trims the list. Safe to call repeatedly / from effects.
 */
export function recordView(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const next = [id, ...read().filter((x) => x !== id)].slice(0, MAX);
  write(next);
}

export function useRecent() {
  const [recent, setRecent] = useState<string[]>([]);
  // Hydrate after mount so server and client markup match (SSR has no storage).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecent(read());
    setReady(true);
    const sync = () => setRecent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const clear = useCallback(() => {
    write([]);
    setRecent([]);
  }, []);

  return { recent, ready, clear };
}
