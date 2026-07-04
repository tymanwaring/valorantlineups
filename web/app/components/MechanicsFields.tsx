"use client";

import TogglePanel from "./TogglePanel";
import { PRECISION_LEVELS } from "@/lib/types";

// Throw-mechanics inputs shared by the add form and edit modal: jump (non-Sova),
// crouch, time-to-land and precision. Sova jump is handled per-dart elsewhere.
export default function MechanicsFields({
  agentSlug,
  defaults,
}: {
  agentSlug: string;
  defaults?: {
    jump?: boolean;
    crouch?: boolean;
    timeToLand?: number;
    precision?: string;
  };
}) {
  if (!agentSlug) return null;
  const showJump = agentSlug !== "sova";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showJump && (
          <TogglePanel name="jump" label="Jump" defaultChecked={defaults?.jump} />
        )}
        <TogglePanel
          name="crouch"
          label="Crouch"
          defaultChecked={defaults?.crouch}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">
            Time to land (s)
          </span>
          <input
            name="timeToLand"
            type="number"
            min="0"
            max="60"
            step="0.1"
            defaultValue={defaults?.timeToLand ?? ""}
            placeholder="e.g. 3.5"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">
            Precision
          </span>
          <select
            name="precision"
            defaultValue={defaults?.precision ?? ""}
            className={inputClass}
          >
            <option value="">N/A</option>
            {PRECISION_LEVELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-panel-border bg-background px-3 py-2 outline-none focus:border-accent";
