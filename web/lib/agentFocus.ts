"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "brimmybuddy:agentfocus";
// Same-tab notifications: the native "storage" event only fires in *other* tabs,
// so we broadcast a custom event to keep every hook instance in sync.
const EVENT = "brimmybuddy:agentfocuschange";

function read(): string {
  if (typeof window === "undefined") return "all";
  try {
    return window.localStorage.getItem(KEY) || "all";
  } catch {
    return "all";
  }
}

function write(slug: string): void {
  try {
    window.localStorage.setItem(KEY, slug);
  } catch {
    // Storage unavailable (private mode / quota) — non-critical.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Persistent "main agent" preference. When set to an agent slug, map views
 * default their agent filter to it (e.g. a Gekko main sees only Gekko lineups
 * unless they change it). "all" means no preference.
 */
export function useAgentFocus() {
  const [focus, setFocusState] = useState<string>("all");
  // Hydrate after mount so server and client markup match (SSR has no storage).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFocusState(read());
    setReady(true);
    const sync = () => setFocusState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setFocus = useCallback((slug: string) => {
    write(slug);
    setFocusState(slug);
  }, []);

  return { focus, setFocus, ready };
}
