"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AddLineupButton from "./AddLineupButton";
import ProModeToggle from "./ProModeToggle";
import AgentFocus from "./AgentFocus";
import LogoutButton from "./LogoutButton";

// Header navigation. Two clusters: view settings (agent focus, pro) and page
// links. On desktop both sit inline (separated by a divider); on mobile the
// links collapse into a hamburger drawer so the bar never crowds.
export default function HeaderNav({
  manage,
  loggedIn,
}: {
  manage: boolean;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const linkClass = "hover:text-accent transition-colors";

  return (
    <nav className="flex items-center gap-3 text-sm font-medium sm:gap-4">
      {/* View settings — always visible (compact). */}
      <AgentFocus />
      <ProModeToggle />

      {/* Desktop: divider + inline page links. */}
      <span className="hidden h-5 w-px bg-panel-border md:block" />
      <div className="hidden items-center gap-5 md:flex">
        <Link href="/" className={linkClass}>
          Maps
        </Link>
        <Link href="/favorites" className={linkClass}>
          Favorites
        </Link>
        <Link href="/recent" className={linkClass}>
          Recent
        </Link>
        {manage && (
          <AddLineupButton className="rounded bg-accent px-3 py-1.5 text-white transition hover:opacity-90" />
        )}
        {loggedIn && <LogoutButton />}
      </div>

      {/* Mobile: hamburger drawer. */}
      <div ref={menuRef} className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-panel-border text-foreground/70 transition hover:border-accent/60 hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 z-40 mt-2 flex w-44 flex-col rounded-md border border-panel-border bg-panel p-1 shadow-xl">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded px-3 py-2 hover:bg-panel-border"
            >
              Maps
            </Link>
            <Link
              href="/favorites"
              onClick={() => setOpen(false)}
              className="rounded px-3 py-2 hover:bg-panel-border"
            >
              Favorites
            </Link>
            <Link
              href="/recent"
              onClick={() => setOpen(false)}
              className="rounded px-3 py-2 hover:bg-panel-border"
            >
              Recent
            </Link>
            {manage && (
              <div className="mt-1 border-t border-panel-border pt-1">
                <AddLineupButton className="w-full rounded bg-accent px-3 py-2 text-center text-white transition hover:opacity-90" />
              </div>
            )}
            {loggedIn && (
              <div className="mt-1 border-t border-panel-border px-3 pt-2">
                <LogoutButton />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
