"use client";

import { useState } from "react";
import { SovaIndicator } from "./SovaIndicator";

// Renders Sova-only charge (1-3) and bounce (0-2) pickers plus a live preview.
// Emits hidden form fields `charge` and `bounces`. Renders nothing when hidden.
export default function SovaFields({
  show,
  defaultCharge,
  defaultBounces,
}: {
  show: boolean;
  defaultCharge?: number;
  defaultBounces?: number;
}) {
  const [charge, setCharge] = useState<number>(defaultCharge ?? 1);
  const [bounces, setBounces] = useState<number>(defaultBounces ?? 0);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-panel-border bg-background/40 p-4">
      <div className="mb-4 flex items-center gap-4">
        <span className="whitespace-nowrap text-sm font-medium text-foreground/80">
          Dart details
        </span>
        <div className="flex-1">
          <SovaIndicator charge={charge} bounces={bounces} variant="wide" />
        </div>
      </div>

      <input type="hidden" name="charge" value={charge} />
      <input type="hidden" name="bounces" value={bounces} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Segmented
          label="Charge (bars)"
          options={[0, 1, 2, 3]}
          value={charge}
          onChange={setCharge}
        />
        <Segmented
          label="Bounces"
          options={[0, 1, 2]}
          value={bounces}
          onChange={setBounces}
        />
      </div>
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-foreground/60">
        {label}
      </span>
      <div className="inline-flex overflow-hidden rounded-md border border-panel-border">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`min-w-10 px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-accent text-white"
                  : "bg-panel text-foreground/70 hover:bg-panel-border"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
