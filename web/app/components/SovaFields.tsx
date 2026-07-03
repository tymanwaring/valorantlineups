"use client";

import { useState, type ReactNode } from "react";
import { SovaIndicator } from "./SovaIndicator";

// Renders Sova-only charge (1-3) and bounce (0-2) pickers plus a live preview.
// Emits hidden form fields `charge` and `bounces`. Renders nothing when hidden.
export default function SovaFields({
  show,
  defaultCharge,
  defaultBounces,
  defaultCharge2,
  defaultBounces2,
  showDoubleShock = false,
  doubleShock = false,
  onDoubleShockChange,
}: {
  show: boolean;
  defaultCharge?: number;
  defaultBounces?: number;
  defaultCharge2?: number;
  defaultBounces2?: number;
  showDoubleShock?: boolean;
  doubleShock?: boolean;
  onDoubleShockChange?: (v: boolean) => void;
}) {
  const [charge, setCharge] = useState<number>(defaultCharge ?? 1);
  const [bounces, setBounces] = useState<number>(defaultBounces ?? 0);
  const [charge2, setCharge2] = useState<number>(defaultCharge2 ?? 1);
  const [bounces2, setBounces2] = useState<number>(defaultBounces2 ?? 0);

  if (!show) return null;

  const toggle = showDoubleShock ? (
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
  ) : null;

  return (
    <div className="space-y-4">
      <DartPanel
        title={doubleShock ? "First dart" : "Dart details"}
        chargeName="charge"
        bouncesName="bounces"
        charge={charge}
        bounces={bounces}
        onCharge={setCharge}
        onBounces={setBounces}
        trailing={toggle}
      />
      {showDoubleShock && doubleShock && (
        <DartPanel
          title="Second dart"
          chargeName="charge2"
          bouncesName="bounces2"
          charge={charge2}
          bounces={bounces2}
          onCharge={setCharge2}
          onBounces={setBounces2}
        />
      )}
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

function DartPanel({
  title,
  chargeName,
  bouncesName,
  charge,
  bounces,
  onCharge,
  onBounces,
  trailing,
}: {
  title: string;
  chargeName: string;
  bouncesName: string;
  charge: number;
  bounces: number;
  onCharge: (v: number) => void;
  onBounces: (v: number) => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-panel-border bg-background/40 p-4">
      <div className="mb-4 flex items-center gap-4">
        <span className="whitespace-nowrap text-sm font-medium text-foreground/80">
          {title}
        </span>
        <div className="flex-1">
          <SovaIndicator charge={charge} bounces={bounces} variant="wide" />
        </div>
      </div>

      <input type="hidden" name={chargeName} value={charge} />
      <input type="hidden" name={bouncesName} value={bounces} />

      <div className="flex flex-wrap items-start gap-4">
        <Segmented
          label="Charge (bars)"
          options={[0, 1, 2, 3]}
          value={charge}
          onChange={onCharge}
        />
        <Segmented
          label="Bounces"
          options={[0, 1, 2]}
          value={bounces}
          onChange={onBounces}
        />
        {trailing}
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
