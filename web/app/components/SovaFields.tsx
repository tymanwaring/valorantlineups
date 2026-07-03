"use client";

import { useState, type ReactNode } from "react";
import { SovaIndicator } from "./SovaIndicator";

// Renders Sova-only charge (1-3) and bounce (0-2) pickers plus a live preview.
// Emits hidden form fields `charge` and `bounces`. Renders nothing when hidden.
export default function SovaFields({
  show,
  defaultCharge,
  defaultBounces,
  defaultJump,
  defaultCharge2,
  defaultBounces2,
  defaultJump2,
  showDoubleShock = false,
  doubleShock = false,
  onDoubleShockChange,
}: {
  show: boolean;
  defaultCharge?: number;
  defaultBounces?: number;
  defaultJump?: boolean;
  defaultCharge2?: number;
  defaultBounces2?: number;
  defaultJump2?: boolean;
  showDoubleShock?: boolean;
  doubleShock?: boolean;
  onDoubleShockChange?: (v: boolean) => void;
}) {
  const [charge, setCharge] = useState<number>(defaultCharge ?? 1);
  const [bounces, setBounces] = useState<number>(defaultBounces ?? 0);
  const [jump, setJump] = useState<boolean>(defaultJump ?? false);
  const [charge2, setCharge2] = useState<number>(defaultCharge2 ?? 1);
  const [bounces2, setBounces2] = useState<number>(defaultBounces2 ?? 0);
  const [jump2, setJump2] = useState<boolean>(defaultJump2 ?? false);

  if (!show) return null;

  const doubleShockToggle = showDoubleShock ? (
    <Toggle
      label="Double Shock"
      value={doubleShock}
      onChange={(v) => onDoubleShockChange?.(v)}
      onLabel="On"
      offLabel="Off"
    />
  ) : null;

  return (
    <div className="space-y-4">
      <DartPanel
        title={doubleShock ? "First dart" : "Dart details"}
        chargeName="charge"
        bouncesName="bounces"
        jumpName="jump"
        charge={charge}
        bounces={bounces}
        jump={jump}
        onCharge={setCharge}
        onBounces={setBounces}
        onJump={setJump}
        trailing={doubleShockToggle}
      />
      {showDoubleShock && doubleShock && (
        <DartPanel
          title="Second dart"
          chargeName="charge2"
          bouncesName="bounces2"
          jumpName="jump2"
          charge={charge2}
          bounces={bounces2}
          jump={jump2}
          onCharge={setCharge2}
          onBounces={setBounces2}
          onJump={setJump2}
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
  jumpName,
  charge,
  bounces,
  jump,
  onCharge,
  onBounces,
  onJump,
  trailing,
}: {
  title: string;
  chargeName: string;
  bouncesName: string;
  jumpName: string;
  charge: number;
  bounces: number;
  jump: boolean;
  onCharge: (v: number) => void;
  onBounces: (v: number) => void;
  onJump: (v: boolean) => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-panel-border bg-background/40 p-4">
      <div className="mb-4 flex items-center gap-4">
        <span className="whitespace-nowrap text-sm font-medium text-foreground/80">
          {title}
        </span>
        <div className="flex-1">
          <SovaIndicator
            charge={charge}
            bounces={bounces}
            jump={jump}
            variant="wide"
          />
        </div>
      </div>

      <input type="hidden" name={chargeName} value={charge} />
      <input type="hidden" name={bouncesName} value={bounces} />
      <input type="hidden" name={jumpName} value={jump ? "true" : "false"} />

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
        <Toggle label="Jump" value={jump} onChange={onJump} />
        {trailing}
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  onLabel = "Yes",
  offLabel = "No",
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <div className="min-w-[7rem] flex-1">
      <span className="mb-1.5 block text-xs font-medium text-foreground/60">
        {label}
      </span>
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={`w-full rounded-md border border-panel-border px-3 py-1.5 text-sm transition ${
          value
            ? "bg-accent text-white"
            : "bg-panel text-foreground/70 hover:bg-panel-border"
        }`}
      >
        {value ? onLabel : offLabel}
      </button>
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
