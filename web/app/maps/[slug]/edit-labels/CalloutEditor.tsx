"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  attackerBottomRotation,
  rotatePoint,
  rotateInverse,
  type Callout,
} from "@/lib/callouts";

// Full-page drag-and-drop editor for a map's callout label positions. Saving
// persists via /api/callouts (Postgres on prod, callouts.json in local dev).
export default function CalloutEditor({
  mapSlug,
  mapName,
  minimap,
  initialCallouts,
}: {
  mapSlug: string;
  mapName: string;
  minimap: string;
  initialCallouts: Callout[];
}) {
  const savedRef = useRef<Callout[]>(initialCallouts.map((c) => ({ ...c })));
  const [callouts, setCallouts] = useState<Callout[]>(() =>
    initialCallouts.map((c) => ({ ...c })),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const mapBoxRef = useRef<HTMLDivElement>(null);

  // Keep the rotation fixed for the whole session (based on the resolved
  // positions) so the map doesn't spin while a spawn label is being dragged.
  const rot = attackerBottomRotation(mapSlug, initialCallouts);

  function moveCallout(i: number, e: React.PointerEvent) {
    const box = mapBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const dx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const dy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    // Pointer is in rotated display space; store in original map space.
    const orig = rotateInverse(dx, dy, rot);
    setCallouts((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? {
              ...c,
              x: Math.round(orig.x * 1e4) / 1e4,
              y: Math.round(orig.y * 1e4) / 1e4,
            }
          : c,
      ),
    );
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/callouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: mapSlug, callouts }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(j?.error || "Save failed");
      }
      savedRef.current = callouts.map((c) => ({ ...c }));
      setMsg("Saved ✓");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCallouts(savedRef.current.map((c) => ({ ...c })));
    setMsg(null);
  }

  // Add a custom callout at the map center; the user then drags it into place.
  function addCallout() {
    const n = newName.trim();
    if (!n) return;
    setCallouts((prev) => [
      ...prev,
      { n, s: "", x: 0.5, y: 0.5, custom: true },
    ]);
    setNewName("");
  }

  function deleteCallout(i: number) {
    setCallouts((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={`/maps/${mapSlug}`}
            className="text-sm text-foreground/50 hover:text-accent"
          >
            ← Back to {mapName}
          </Link>
          <h1 className="mt-1 font-display text-3xl tracking-widest">
            Edit Labels
            <span className="ml-3 text-lg text-foreground/40">{mapName}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {msg && (
            <span
              className={`text-xs ${
                msg.startsWith("Saved") ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {msg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md border border-accent bg-accent px-3 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save labels"}
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-panel-border bg-panel px-3 py-2 text-sm text-foreground/70 transition hover:bg-panel-border"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mx-auto mb-3 flex max-w-3xl items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCallout();
            }
          }}
          placeholder="Add a custom callout (e.g. Tree molly spot)"
          className="flex-1 rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={addCallout}
          disabled={!newName.trim()}
          className="rounded-md border border-panel-border bg-panel px-3 py-2 text-sm text-foreground/80 transition hover:bg-panel-border disabled:opacity-50"
        >
          + Add callout
        </button>
      </div>

      <div className="mx-auto max-w-3xl">
        <div
          ref={mapBoxRef}
          className="relative aspect-square w-full overflow-hidden rounded-xl border border-panel-border bg-black/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={minimap}
            alt={`${mapName} minimap`}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ transform: `rotate(${rot}deg)` }}
            draggable={false}
          />

          <div className="absolute inset-0 z-[8]" style={{ pointerEvents: "none" }}>
            {callouts.map((c, i) => {
              const isSite = c.n === "Site";
              const isSpawn = c.n === "Spawn";
              const attacker = /attack/i.test(c.s);
              const defender = /defend/i.test(c.s);

              let label = c.n;
              if (isSite) label = `${c.s} Site`;
              else if (isSpawn && attacker) label = "Attacker Spawn";
              else if (isSpawn && defender) label = "Defender Spawn";

              const color = c.custom
                ? "#ffd60a"
                : isSpawn
                  ? attacker
                    ? "#ff4655"
                    : defender
                      ? "#38bdf8"
                      : "#ffffff"
                  : "#ffffff";

              const p = rotatePoint(c.x, c.y, rot);

              return (
                <span
                  key={`${c.n}-${c.s}-${i}`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragIdx(i);
                    moveCallout(i, e);
                  }}
                  onPointerMove={(e) => {
                    if (dragIdx === i) moveCallout(i, e);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setDragIdx(null);
                  }}
                  className={`absolute inline-flex cursor-move touch-none select-none items-center gap-1 whitespace-nowrap rounded bg-black/50 px-1 uppercase tracking-wide ring-1 ${
                    dragIdx === i
                      ? "ring-accent"
                      : c.custom
                        ? "ring-[#ffd60a]/70"
                        : "ring-white/50"
                  } ${
                    isSite
                      ? "text-xs font-bold"
                      : isSpawn
                        ? "text-[10px] font-bold"
                        : c.custom
                          ? "text-[10px] font-semibold"
                          : "text-[9px] font-semibold"
                  }`}
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    color,
                    textShadow: "0 1px 3px rgba(0,0,0,0.95)",
                    pointerEvents: "auto",
                  }}
                >
                  {label}
                  {c.custom && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCallout(i);
                      }}
                      aria-label={`Delete ${label}`}
                      className="leading-none text-white/60 hover:text-red-400"
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-center text-sm text-foreground/50">
          Drag each label to reposition it. Add custom callouts (shown in gold)
          for your own lineup spots and drag them into place; hit × to remove
          one. Save labels to keep changes — Reset reverts to the last save.
        </p>
      </div>
    </div>
  );
}
