"use client";

import { useRef, useState } from "react";
import type { LineupStep } from "@/lib/types";
import { DEFAULT_STEP_CAPTIONS } from "@/lib/types";

type Row = {
  id: number;
  caption: string;
  existingImage?: string;
  previewUrl?: string;
};

let counter = 0;
const nextId = () => ++counter;

function defaultRows(): Row[] {
  return DEFAULT_STEP_CAPTIONS.map((caption) => ({ id: nextId(), caption }));
}

function fromSteps(steps: LineupStep[]): Row[] {
  if (!steps || steps.length === 0) return defaultRows();
  return steps.map((s) => ({
    id: nextId(),
    caption: s.caption,
    existingImage: s.image,
  }));
}

export default function StepsEditor({
  initialSteps,
}: {
  initialSteps?: LineupStep[];
}) {
  const [rows, setRows] = useState<Row[]>(() => fromSteps(initialSteps ?? []));
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, { id: nextId(), caption: "" }]);
  }

  function removeRow(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function move(index: number, dir: -1 | 1) {
    setRows((rs) => {
      const next = [...rs];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function onPickFile(id: number, input: HTMLInputElement) {
    const file = input.files?.[0];
    update(id, { previewUrl: file ? URL.createObjectURL(file) : undefined });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/80">
          Steps ({rows.length})
        </span>
        <span className="text-xs text-foreground/40">
          Add a screenshot + caption for each step
        </span>
      </div>

      {/* Lets the server know steps were submitted even if empty. */}
      <input type="hidden" name="steps-present" value="1" />

      {rows.map((row, i) => {
        const thumb = row.previewUrl || row.existingImage;
        return (
          <div
            key={row.id}
            className="rounded-lg border border-panel-border bg-background/40 p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded px-1 text-foreground/50 hover:text-accent disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <span className="text-center text-xs text-foreground/40">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="rounded px-1 text-foreground/50 hover:text-accent disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>

              <div className="h-16 w-24 shrink-0 overflow-hidden rounded border border-panel-border bg-black/40">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-foreground/30">
                    no image
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  name={`step-${i}-caption`}
                  value={row.caption}
                  onChange={(e) => update(row.id, { caption: e.target.value })}
                  placeholder={`Caption (e.g. ${
                    DEFAULT_STEP_CAPTIONS[i] ?? "Step " + (i + 1)
                  })`}
                  className="w-full rounded-md border border-panel-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
                <input
                  ref={(el) => {
                    fileInputs.current[row.id] = el;
                  }}
                  type="file"
                  name={`step-${i}-image`}
                  accept="image/*"
                  onChange={(e) => onPickFile(row.id, e.currentTarget)}
                  className="w-full text-xs text-foreground/70 file:mr-3 file:rounded file:border-0 file:bg-panel-border file:px-2 file:py-1 file:text-foreground"
                />
                {row.existingImage && (
                  <input
                    type="hidden"
                    name={`step-${i}-existing`}
                    value={row.existingImage}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded p-1 text-foreground/40 hover:text-accent"
                aria-label="Remove step"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-lg border border-dashed border-panel-border py-2 text-sm text-foreground/70 hover:border-accent/60 hover:text-accent"
      >
        + Add step
      </button>
    </div>
  );
}
