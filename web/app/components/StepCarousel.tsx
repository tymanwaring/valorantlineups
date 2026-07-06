"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { LineupStep } from "@/lib/types";
import AnnotatedImage from "@/app/components/AnnotatedImage";

// Hold-Shift precision magnifier (only in full-screen previews).
const LENS_SIZE = 200;
const LENS_ZOOM = 2.5;

export default function StepCarousel({
  steps,
  onImageClick,
  enableKeyboard = true,
  overlays,
  onIndexChange,
  enableZoom = false,
  initialIndex = 0,
}: {
  steps: LineupStep[];
  /** When set, clicking the image (not the controls) calls this with the
   *  currently visible step index. */
  onImageClick?: (index: number) => void;
  enableKeyboard?: boolean;
  /** Optional per-step overlay node shown above the caption (aligned to steps). */
  overlays?: (ReactNode | null)[];
  /** Notified whenever the visible step index changes (and on mount). */
  onIndexChange?: (i: number) => void;
  /** Enable the hold-Shift magnifier over the image (full-screen previews). */
  enableZoom?: boolean;
  /** Step to show first when mounted (e.g. the image a user clicked). */
  initialIndex?: number;
}) {
  const n = steps.length;
  const [i, setI] = useState(initialIndex);
  const frameRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{
    cx: number;
    cy: number;
    w: number;
    h: number;
  } | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    if (!enableZoom) return;
    const down = (e: KeyboardEvent) => e.key === "Shift" && setShiftHeld(true);
    const up = (e: KeyboardEvent) => e.key === "Shift" && setShiftHeld(false);
    const blur = () => setShiftHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [enableZoom]);

  const trackLens = (e: React.MouseEvent) => {
    if (!enableZoom) return;
    const box = frameRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (cx < 0 || cy < 0 || cx > rect.width || cy > rect.height) {
      setLens(null);
      return;
    }
    setLens({ cx, cy, w: rect.width, h: rect.height });
  };

  const prev = useCallback(() => setI((v) => (v - 1 + n) % n), [n]);
  const next = useCallback(() => setI((v) => (v + 1) % n), [n]);

  useEffect(() => {
    setI(initialIndex);
  }, [steps, initialIndex]);

  const current = Math.min(i, Math.max(0, n - 1));
  useEffect(() => {
    onIndexChange?.(current);
  }, [current, onIndexChange]);

  useEffect(() => {
    if (n <= 1 || !enableKeyboard) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, next, prev, enableKeyboard]);

  // Touch swipe (mobile) — horizontal drag over the image switches steps.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current || n <= 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
  };

  if (n === 0) return null;

  const step = steps[current];

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-panel-border bg-black/50">
        <div
          ref={frameRef}
          className={`relative flex aspect-video items-center justify-center ${
            enableZoom && shiftHeld ? "cursor-zoom-in" : onImageClick ? "cursor-pointer" : ""
          }`}
          onClick={onImageClick ? () => onImageClick(current) : undefined}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseMove={trackLens}
          onMouseLeave={() => setLens(null)}
        >
          {step.image ? (
            <AnnotatedImage
              src={step.image}
              annotations={step.annotations}
              alt={step.caption || `Step ${current + 1}`}
              className="h-full w-full"
            />
          ) : (
            <span className="px-6 text-center text-foreground/40">
              No image for this step
            </span>
          )}

          {/* Hold-Shift precision magnifier over the current image. */}
          {enableZoom && shiftHeld && lens && step.image && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/80 shadow-xl"
              style={{
                left: lens.cx,
                top: lens.cy,
                width: LENS_SIZE,
                height: LENS_SIZE,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: lens.w,
                  height: lens.h,
                  transformOrigin: "0 0",
                  transform: `translate(${LENS_SIZE / 2 - LENS_ZOOM * lens.cx}px, ${
                    LENS_SIZE / 2 - LENS_ZOOM * lens.cy
                  }px) scale(${LENS_ZOOM})`,
                }}
              >
                <AnnotatedImage
                  src={step.image}
                  annotations={step.annotations}
                  alt=""
                  className="h-full w-full"
                />
              </div>
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-accent/70" />
              <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-accent/70" />
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent bg-accent/40" />
            </div>
          )}

          {/* Caption overlay — compact pills (no full-width dark band) so the
              bottom of the image stays visible for lining up the reference. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
            <div className="flex flex-col items-start gap-2">
              {overlays?.[current] && <div className="flex">{overlays[current]}</div>}
              <p className="rounded bg-black/60 px-2 py-0.5 text-sm font-semibold text-white">
                <span className="mr-2 text-accent">{current + 1}.</span>
                {step.caption || `Step ${current + 1}`}
              </p>
            </div>
            <span className="shrink-0 rounded bg-black/60 px-2 py-0.5 text-xs text-white/70">
              {current + 1} / {n}
            </span>
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
