"use client";

import { useProMode } from "@/lib/proMode";

// App-wide toggle: when on, lineup views show only the "aim" step for quick
// in-match reference. State persists in localStorage across pages/sessions.
export default function ProModeToggle() {
  const { pro, toggle } = useProMode();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={pro}
      title="Pro mode — show only where to aim, for quick in-match reference"
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
        pro
          ? "border-yellow-400 bg-yellow-400 text-black"
          : "border-panel-border text-foreground/60 hover:border-accent/60 hover:text-foreground"
      }`}
    >
      Pro
    </button>
  );
}
