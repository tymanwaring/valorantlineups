"use client";

import { useEffect, useRef, useState } from "react";
import { getMap } from "@/lib/maps";
import MinimapCallouts from "@/app/components/MinimapCallouts";
import {
  attackerBottomRotation,
  rotatePoint,
  rotateInverse,
  type Rotation,
} from "@/lib/callouts";

type Pt = { x: number; y: number };

// Hover magnifier settings.
const LENS_SIZE = 132; // px diameter of the loupe
const ZOOM = 1.75; // magnification factor

// Admin tool: click a top-down minimap to place the throw ("from") and optional
// landing ("to") points. Emits normalized (0-1) form fields fromX/fromY/toX/toY.
export default function MinimapPicker({
  mapSlug,
  defaultFrom,
  defaultTo,
}: {
  mapSlug: string;
  defaultFrom?: Pt;
  defaultTo?: Pt;
}) {
  const [from, setFrom] = useState<Pt | null>(defaultFrom ?? null);
  const [to, setTo] = useState<Pt | null>(defaultTo ?? null);
  const [mode, setMode] = useState<"from" | "to">("from");
  // Cursor position over the map (in px + box dimensions) that drives the loupe.
  const [lens, setLens] = useState<{
    px: number;
    py: number;
    w: number;
    h: number;
  } | null>(null);
  // The magnifier only shows while Shift is held.
  const [shiftHeld, setShiftHeld] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const map = getMap(mapSlug);
  const rot = attackerBottomRotation(mapSlug);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    const onBlur = () => setShiftHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  function trackLens(e: React.MouseEvent) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px < 0 || py < 0 || px > rect.width || py > rect.height) {
      setLens(null);
      return;
    }
    setLens({ px, py, w: rect.width, h: rect.height });
  }

  function place(e: React.MouseEvent) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const dx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const dy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    // Store in original minimap space (undo the display rotation).
    const pt = rotateInverse(dx, dy, rot);
    if (mode === "from") {
      setFrom(pt);
      if (!to) setMode("to");
    } else {
      setTo(pt);
    }
  }

  if (!map) {
    return (
      <div className="rounded-lg border border-dashed border-panel-border p-4 text-sm text-foreground/50">
        Select a map to place the lineup on the minimap.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-panel-border bg-background/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-foreground/80">
          Minimap position
        </span>
        <button
          type="button"
          onClick={() => setMode("from")}
          className={`rounded-md border px-3 py-1 text-xs transition ${
            mode === "from"
              ? "border-accent bg-accent text-white"
              : "border-panel-border bg-panel text-foreground/70 hover:bg-panel-border"
          }`}
        >
          {from ? "Starting position ✓" : "Set starting position"}
        </button>
        <button
          type="button"
          onClick={() => setMode("to")}
          className={`rounded-md border px-3 py-1 text-xs transition ${
            mode === "to"
              ? "border-accent bg-accent text-white"
              : "border-panel-border bg-panel text-foreground/70 hover:bg-panel-border"
          }`}
        >
          {to ? "Ending position ✓" : "Set ending position"}
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom(null);
              setTo(null);
              setMode("from");
            }}
            className="rounded-md border border-panel-border bg-panel px-3 py-1 text-xs text-foreground/70 hover:bg-panel-border"
          >
            Clear
          </button>
        )}
      </div>

      <div
        ref={boxRef}
        onClick={place}
        onMouseMove={trackLens}
        onMouseLeave={() => setLens(null)}
        className="relative mx-auto aspect-square w-full max-w-[420px] cursor-crosshair overflow-hidden rounded-md border border-panel-border bg-black/40 select-none"
      >
        <MapLayers
          minimapSrc={map.minimap}
          mapName={map.name}
          slug={mapSlug}
          rot={rot}
          from={from}
          to={to}
        />

        {/* Hover magnifier (hold Shift): mirrors the rendered map (image,
            callouts and markers), scaled and re-centered on the cursor so
            precise start/end clicks are easy to place. */}
        {lens && shiftHeld && (
          <div
            className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/80 shadow-lg"
            style={{
              left: lens.px,
              top: lens.py,
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
                transform: `translate(${LENS_SIZE / 2 - ZOOM * lens.px}px, ${
                  LENS_SIZE / 2 - ZOOM * lens.py
                }px) scale(${ZOOM})`,
              }}
            >
              <MapLayers
                minimapSrc={map.minimap}
                mapName={map.name}
                slug={mapSlug}
                rot={rot}
                from={from}
                to={to}
              />
            </div>
            {/* Crosshair marking the exact click point (lens center). */}
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-accent/70" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-accent/70" />
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent bg-accent/30" />
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-foreground/50">
        Hold <kbd className="rounded border border-panel-border bg-panel px-1">Shift</kbd>{" "}
        and hover to zoom, then click to place the highlighted point. The ending
        position is optional.
      </p>

      <input type="hidden" name="fromX" value={from ? from.x.toFixed(4) : ""} />
      <input type="hidden" name="fromY" value={from ? from.y.toFixed(4) : ""} />
      <input type="hidden" name="toX" value={to ? to.x.toFixed(4) : ""} />
      <input type="hidden" name="toY" value={to ? to.y.toFixed(4) : ""} />
    </div>
  );
}

// The stacked map visuals (image, callouts, connector line, start/end markers)
// shared by the main picker and the hover magnifier so both stay in sync.
function MapLayers({
  minimapSrc,
  mapName,
  slug,
  rot,
  from,
  to,
}: {
  minimapSrc: string;
  mapName: string;
  slug: string;
  rot: Rotation;
  from: Pt | null;
  to: Pt | null;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={minimapSrc}
        alt={`${mapName} minimap`}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{ transform: `rotate(${rot}deg)` }}
        draggable={false}
      />

      <MinimapCallouts slug={slug} />

      {from && to && (
        <svg
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1={rotatePoint(from.x, from.y, rot).x * 100}
            y1={rotatePoint(from.x, from.y, rot).y * 100}
            x2={rotatePoint(to.x, to.y, rot).x * 100}
            y2={rotatePoint(to.x, to.y, rot).y * 100}
            stroke="#ff4655"
            strokeWidth={0.6}
            strokeDasharray="2 1.5"
          />
        </svg>
      )}

      {from && (
        <Marker pt={rotatePoint(from.x, from.y, rot)} label="Start" color="#ff4655" />
      )}
      {to && (
        <Marker pt={rotatePoint(to.x, to.y, rot)} label="End" color="#38e0c8" />
      )}
    </>
  );
}

function Marker({
  pt,
  label,
  color,
}: {
  pt: Pt;
  label: string;
  color: string;
}) {
  return (
    <span
      className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
    >
      <span
        className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow"
        style={{ background: color }}
      />
      <span
        className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 text-[9px] font-semibold uppercase tracking-wide text-white"
      >
        {label}
      </span>
    </span>
  );
}
