"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "brimmybuddy:favorites";
// Same-tab notifications: the native "storage" event only fires in *other*
// tabs, so we broadcast a custom event to keep every hook instance in sync.
const EVENT = "brimmybuddy:favchange";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
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

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  // Hydrate after mount so server and client markup match (SSR has no storage).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(read());
    setReady(true);
    const sync = () => setFavorites(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    write(next);
    setFavorites(next);
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  return { favorites, isFavorite, toggle, ready };
}
