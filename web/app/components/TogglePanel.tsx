"use client";

import { useState } from "react";

// Full-width Yes/No toggle styled like the Sova dart panels. Emits a hidden
// form field `name` with "true"/"false". Renders nothing unless `show`.
export default function TogglePanel({
  show = true,
  name,
  label,
  defaultChecked = false,
}: {
  show?: boolean;
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  const [on, setOn] = useState<boolean>(defaultChecked);
  if (!show) return null;
  return (
    <div className="rounded-lg border border-panel-border bg-background/40 p-4">
      <span className="mb-1.5 block text-xs font-medium text-foreground/60">
        {label}
      </span>
      <input type="hidden" name={name} value={on ? "true" : "false"} />
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setOn((v) => !v)}
        className={`w-full rounded-md border border-panel-border px-3 py-1.5 text-sm transition ${
          on
            ? "bg-accent text-white"
            : "bg-panel text-foreground/70 hover:bg-panel-border"
        }`}
      >
        {on ? "Yes" : "No"}
      </button>
    </div>
  );
}
