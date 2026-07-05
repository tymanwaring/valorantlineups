"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "brimmybuddy:promode";
// Same-tab notifications: the native "storage" event only fires in *other*
// tabs, so we broadcast a custom event to keep every hook instance in sync.
const EVENT = "brimmybuddy:promodechange";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // Storage unavailable (private mode / quota) — non-critical.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Pro mode: a persisted, app-wide toggle. When on, lineup views collapse to
 * just the "aim" step(s) for the fastest possible in-match reference.
 */
export function useProMode() {
  const [pro, setPro] = useState(false);
  // Hydrate after mount so server and client markup match (SSR has no storage).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPro(read());
    setReady(true);
    const sync = () => setPro(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    write(next);
    setPro(next);
  }, []);

  return { pro, ready, toggle };
}
