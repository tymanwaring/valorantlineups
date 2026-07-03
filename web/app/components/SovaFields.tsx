"use client";

import { useState } from "react";
import { SovaIndicator } from "./SovaIndicator";

// Renders Sova-only charge (1-3) and bounce (0-2) pickers plus a live preview.
// Emits hidden form fields `charge` and `bounces`. Renders nothing when hidden.
export default function SovaFields({
  show,
  defaultCharge,
  defaultBounces,
  showDoubleShock = false,
  doubleShock = false,
  onDoubleShockChange,
}: {
  show: boolean;
  defaultCharge?: number;
  defaultBounces?: number;
  showDoubleShock?: boolean;
  doubleShock?: boolean;
  onDoubleShockChange?: (v: boolean) => void;
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

      <div className="flex flex-wrap items-start gap-4">
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
        {showDoubleShock && (
          <div className="min-w-[7rem] flex-1">
            <span className="mb-1.5 block text-xs font-medium text-foreground/60">
              Double Shock
            </span>
            <button
              type="button"
              aria-pressed={doubleShock}
              onClick={() => onDoubleShockChange?.(!doubleShock)}
              className={`w-full rounded-md border border-panel-border px-3 py-1.5 text-sm transition ${
                doubleShock
                  ? "bg-accent text-white"
                  : "bg-panel text-foreground/70 hover:bg-panel-border"
              }`}
            >
              {doubleShock ? "On" : "Off"}
            </button>
          </div>
        )}
      </div>

      {showDoubleShock && (
        <input
          type="hidden"
          name="doubleShock"
          value={doubleShock ? "true" : "false"}
        />
      )}
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
    <div className="min-w-[7rem] flex-1">
      <span className="mb-1.5 block text-xs font-medium text-foreground/60">
        {label}
      </span>
      <div className="flex w-full overflow-hidden rounded-md border border-panel-border">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 px-3 py-1.5 text-sm transition ${
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
