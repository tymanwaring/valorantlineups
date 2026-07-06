"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, getAgent } from "@/lib/agents";
import { useAgentFocus } from "@/lib/agentFocus";

// Header dropdown to pick a "main agent". Persists globally so map views default
// to just that agent's lineups. Handy for one-trick mains.
export default function AgentFocus({ usedAgents }: { usedAgents: string[] }) {
  const { focus, setFocus, ready } = useAgentFocus();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Only offer agents that actually have lineups (plus keep a currently-focused
  // agent visible even if its last lineup was removed, so it can be cleared).
  const used = new Set(usedAgents);
  const agents = AGENTS.filter(
    (a) => used.has(a.slug) || a.slug === focus,
  ).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = ready && focus !== "all" ? getAgent(focus) : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Focus on one agent's lineups"
        className={`flex items-center gap-1.5 rounded-full border border-panel-border px-2.5 py-1 text-xs font-semibold transition hover:border-accent/60 ${
          current ? "text-foreground" : "text-foreground/60 hover:text-foreground"
        }`}
      >
        {current ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={current.icon}
            alt={current.name}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
        <span className="hidden sm:inline">
          {current ? current.name : "All agents"}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3 opacity-60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-[70vh] w-48 overflow-y-auto rounded-md border border-panel-border bg-panel p-1 shadow-xl">
          <button
            onClick={() => {
              setFocus("all");
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
              focus === "all"
                ? "bg-accent text-white"
                : "text-foreground/80 hover:bg-panel-border"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            All agents
          </button>
          {agents.map((a) => (
              <button
                key={a.slug}
                onClick={() => {
                  setFocus(a.slug);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                  focus === a.slug
                    ? "bg-accent text-white"
                    : "text-foreground/80 hover:bg-panel-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.icon}
                  alt={a.name}
                  className="h-6 w-6 rounded-full object-cover"
                />
                {a.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
