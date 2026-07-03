"use client";

import { useState } from "react";

// Full-width "requires jump throw" toggle for non-Sova agents, styled to match
// the Sova dart panel. Emits form field `jump`. Renders nothing unless shown.
export default function JumpCheckbox({
  show,
  defaultChecked = false,
}: {
  show: boolean;
  defaultChecked?: boolean;
}) {
  const [jump, setJump] = useState<boolean>(defaultChecked);
  if (!show) return null;
  return (
    <div className="rounded-lg border border-panel-border bg-background/40 p-4">
      <span className="mb-1.5 block text-xs font-medium text-foreground/60">
        Jump
      </span>
      <input type="hidden" name="jump" value={jump ? "true" : "false"} />
      <button
        type="button"
        aria-pressed={jump}
        onClick={() => setJump((v) => !v)}
        className={`w-full rounded-md border border-panel-border px-3 py-1.5 text-sm transition ${
          jump
            ? "bg-accent text-white"
            : "bg-panel text-foreground/70 hover:bg-panel-border"
        }`}
      >
        {jump ? "Yes" : "No"}
      </button>
    </div>
  );
}
