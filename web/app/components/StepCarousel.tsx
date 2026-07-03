"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { LineupStep } from "@/lib/types";

export default function StepCarousel({
  steps,
  onImageClick,
  enableKeyboard = true,
  overlays,
}: {
  steps: LineupStep[];
  /** When set, clicking the image (not the controls) calls this. */
  onImageClick?: () => void;
  enableKeyboard?: boolean;
  /** Optional per-step overlay node shown above the caption (aligned to steps). */
  overlays?: (ReactNode | null)[];
}) {
  const n = steps.length;
  const [i, setI] = useState(0);

  const prev = useCallback(() => setI((v) => (v - 1 + n) % n), [n]);
  const next = useCallback(() => setI((v) => (v + 1) % n), [n]);

  useEffect(() => {
    setI(0);
  }, [steps]);

  useEffect(() => {
    if (n <= 1 || !enableKeyboard) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, next, prev, enableKeyboard]);

  if (n === 0) return null;

  const current = Math.min(i, n - 1);
  const step = steps[current];

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-panel-border bg-black/50">
        <div
          className={`relative flex aspect-video items-center justify-center ${
            onImageClick ? "cursor-pointer" : ""
          }`}
          onClick={onImageClick}
        >
          {step.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={step.image}
              alt={step.caption || `Step ${current + 1}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="px-6 text-center text-foreground/40">
              No image for this step
            </span>
          )}

          {/* Caption overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
            {overlays?.[current] && (
              <div className="mb-2 flex">{overlays[current]}</div>
            )}
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                <span className="mr-2 text-accent">{current + 1}.</span>
                {step.caption || `Step ${current + 1}`}
              </p>
              <span className="shrink-0 rounded bg-black/60 px-2 py-0.5 text-xs text-white/70">
                {current + 1} / {n}
              </span>
            </div>
          </div>

          {n > 1 && (
            <>
              <button
                type="button"
                onClick={stop(prev)}
                aria-label="Previous step"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-accent"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={stop(next)}
                aria-label="Next step"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-accent"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      {n > 1 && (
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={stop(() => setI(idx))}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === current
                  ? "w-6 bg-accent"
                  : "w-2 bg-foreground/30 hover:bg-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
