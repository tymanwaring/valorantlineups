"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAgent, AGENTS } from "@/lib/agents";
import { getMap, getMapSites } from "@/lib/maps";
import type { Lineup } from "@/lib/types";
import { proStepIndices, PRECISION_LEVELS } from "@/lib/types";
import { lineupLink } from "@/lib/lineup-link";
import { recordView } from "@/lib/recent";
import { useProMode } from "@/lib/proMode";
import StepCarousel from "@/app/components/StepCarousel";
import ImageAnnotator from "@/app/components/ImageAnnotator";
import { useAnnotatableSteps } from "@/app/components/useAnnotatableSteps";
import { SovaIndicator } from "@/app/components/SovaIndicator";
import LineupTags from "@/app/components/LineupTags";
import FavoriteStar from "@/app/components/FavoriteStar";
import { useFavorites } from "@/lib/favorites";
import { useAgentFocus } from "@/lib/agentFocus";
import MinimapCallouts from "@/app/components/MinimapCallouts";
import {
  buildCardDartOverlays,
  LineupOverlayBadges,
} from "@/app/components/lineupBadges";
import {
  attackerBottomRotation,
  rotatePoint,
  type Callout,
} from "@/lib/callouts";

// Throw-marker ring color by precision level (matches the tag colors):
// High = red, Medium = amber, Low = green; neutral gray when unset/mixed.
function precisionColor(precision?: string): string {
  switch (precision) {
    case "High":
      return "#ff4655";
    case "Medium":
      return "#fbbf24";
    case "Low":
      return "#34d399";
    default:
      return "#94a3b8";
  }
}

// Quiet neutral ring for markers with no precision set (so we don't imply a
// level). Deliberately dim — precision is conveyed only by green/yellow/red.
const NEUTRAL_RING = "#3a4150";

// CSS `background` for a marker's precision ring. Only lineups that actually have
// a precision contribute colored arcs; unset ones are ignored (never a gray
// segment). A single/uniform precision is a solid color; a mix becomes a
// conic-gradient of proportional arcs. All-unset falls back to the neutral ring.
function precisionRing(items: Lineup[]): string {
  const order = ["High", "Medium", "Low"];
  const segs = order
    .map((p) => ({ p, c: items.filter((l) => l.precision === p).length }))
    .filter((g) => g.c > 0);

  if (segs.length === 0) return NEUTRAL_RING;
  if (segs.length === 1) return precisionColor(segs[0].p);

  const total = segs.reduce((sum, g) => sum + g.c, 0);
  let acc = 0;
  const stops = segs.map((s) => {
    const start = (acc / total) * 360;
    acc += s.c;
    const end = (acc / total) * 360;
    return `${precisionColor(s.p)} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

type Side = "Attack" | "Defense";
type SideFilter = Side | "all";

// Spatial "where is it thrown from" view for a single map. Reads only the
// lineups already scoped to this map by the server component.
export default function MinimapView({
  mapSlug,
  lineups,
  callouts,
  canEdit = false,
  onEdit,
  onDelete,
  onRefresh,
}: {
  mapSlug: string;
  lineups: Lineup[];
  callouts?: Callout[];
  canEdit?: boolean;
  onEdit?: (l: Lineup) => void;
  onDelete?: (l: Lineup) => void;
  onRefresh?: () => void;
}) {
  const [side, setSide] = useState<SideFilter>("Attack");
  const [agent, setAgent] = useState<string>("all");
  const [selected, setSelected] = useState<Lineup | null>(null);
  const [cluster, setCluster] = useState<Lineup[] | null>(null);
  const [showCallouts, setShowCallouts] = useState(true);
  const [precisionFilter, setPrecisionFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { favorites } = useFavorites();
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const { focus, ready: focusReady } = useAgentFocus();
  const sites = useMemo(() => getMapSites(mapSlug), [mapSlug]);
  const activeFilters =
    (precisionFilter !== "all" ? 1 : 0) +
    (siteFilter !== "all" ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  const map = getMap(mapSlug);

  // Close the filter popover when clicking outside it.
  useEffect(() => {
    if (!filterOpen) return;
    function onDocClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  // Reflect the currently open lineup in the address bar so it can be copied /
  // shared straight from the URL (no need to hit Share). Preserves other params.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (selected) {
        p.set("lineup", selected.id);
        p.set("side", selected.side);
      } else {
        p.delete("lineup");
      }
      const qs = p.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `?${qs}` : window.location.pathname,
      );
    } catch {
      // History API unavailable — non-critical.
    }
  }, [selected]);

  // Lineups on this side that have a placed throw position, then narrowed by any
  // active precision filter (so agent counts + markers all stay consistent).
  const agentFocused = focusReady && focus !== "all";
  const placed = useMemo(
    () =>
      lineups.filter(
        (l) =>
          (side === "all" || l.side === side) &&
          l.fromX != null &&
          l.fromY != null &&
          (precisionFilter === "all" || l.precision === precisionFilter) &&
          (siteFilter === "all" || l.site === siteFilter) &&
          (!favoritesOnly || favSet.has(l.id)) &&
          (!agentFocused || l.agentSlug === focus),
      ),
    [lineups, side, precisionFilter, siteFilter, favoritesOnly, favSet, agentFocused, focus],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of placed) m[l.agentSlug] = (m[l.agentSlug] ?? 0) + 1;
    return m;
  }, [placed]);

  // Only surface agents that actually have positioned lineups on this view so
  // the picker doesn't fill up with unusable options.
  const agentsHere = useMemo(
    () => AGENTS.filter((a) => (counts[a.slug] ?? 0) > 0),
    [counts],
  );

  // If the active agent filter no longer has lineups here, reset to All.
  useEffect(() => {
    if (agent !== "all" && !agentsHere.some((a) => a.slug === agent)) {
      setAgent("all");
    }
  }, [agent, agentsHere]);

  const shown = useMemo(
    () =>
      agent === "all" ? placed : placed.filter((l) => l.agentSlug === agent),
    [placed, agent],
  );

  // Group lineups whose starting positions are close together so overlapping
  // markers collapse into one with a count badge.
  const clusters = useMemo(
    () =>
      agglomerate(
        shown.map((l) => ({ x: l.fromX ?? 0, y: l.fromY ?? 0, item: l })),
        0.045,
      ),
    [shown],
  );

  // Landing spots grouped by proximity. Keep this radius tight so only landings
  // that genuinely sit on top of each other merge — lineups thrown from the
  // same spot but landing in different areas must stay as separate markers.
  const landingClusters = useMemo(() => clusterLandings(shown, 0.03), [shown]);

  // Connector lines, de-duplicated when both start AND end are near-identical.
  const lines = useMemo(() => {
    const TH = 0.03;
    const segs: { fx: number; fy: number; tx: number; ty: number }[] = [];
    for (const l of shown) {
      if (l.fromX == null || l.fromY == null || l.toX == null || l.toY == null)
        continue;
      const dup = segs.find(
        (s) =>
          Math.hypot(s.fx - l.fromX!, s.fy - l.fromY!) < TH &&
          Math.hypot(s.tx - l.toX!, s.ty - l.toY!) < TH,
      );
      if (!dup) segs.push({ fx: l.fromX, fy: l.fromY, tx: l.toX, ty: l.toY });
    }
    return segs;
  }, [shown]);

  const sideAccent = side === "Defense" ? "#38bdf8" : "#ff4655";
  const sideLabel = side === "all" ? "All" : side;
  const rot = attackerBottomRotation(mapSlug, callouts);

  return (
    <div style={{ ["--accent" as string]: sideAccent }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-widest text-accent transition-colors">
            {sideLabel}
          </span>
          <span className="text-foreground/40">{map?.name ?? mapSlug}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => setShowCallouts((v) => !v)}
            className={`rounded-md border px-3 py-2 text-sm transition ${
              showCallouts
                ? "border-accent bg-accent text-white"
                : "border-panel-border bg-panel text-foreground/70 hover:bg-panel-border"
            }`}
          >
            Callouts
          </button>

          {/* Filters popover (precision + favorites). Tucked behind an icon so
              it stays out of the way until needed. */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              aria-label="Filters"
              title="Filters"
              className={`relative flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition ${
                activeFilters > 0
                  ? "border-accent bg-accent text-white"
                  : "border-panel-border bg-panel text-foreground/70 hover:bg-panel-border"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-accent">
                  {activeFilters}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-panel-border bg-panel shadow-xl">
                <div className="flex items-center justify-between border-b border-panel-border px-4 py-2.5">
                  <span className="text-sm font-semibold">Filters</span>
                  <button
                    onClick={() => {
                      setPrecisionFilter("all");
                      setSiteFilter("all");
                      setFavoritesOnly(false);
                    }}
                    disabled={activeFilters === 0}
                    className="text-xs text-foreground/50 transition hover:text-accent disabled:opacity-40"
                  >
                    Reset
                  </button>
                </div>

                <div className="px-4 py-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    Site
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", ...sites] as string[]).map((s) => {
                      const on = siteFilter === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setSiteFilter(s)}
                          className={`rounded-full border px-2.5 py-1 text-xs transition ${
                            on
                              ? "border-accent bg-accent text-white"
                              : "border-panel-border text-foreground/70 hover:bg-panel-border"
                          }`}
                        >
                          {s === "all" ? "All" : s === "Mid" ? "Mid" : `${s} Site`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-panel-border px-4 py-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    Precision
                  </div>
                  <div className="grid grid-cols-4 overflow-hidden rounded-md border border-panel-border text-xs">
                    {(["all", ...PRECISION_LEVELS] as string[]).map((p, idx) => {
                      const on = precisionFilter === p;
                      const label =
                        p === "all" ? "All" : p === "Medium" ? "Med" : p;
                      return (
                        <button
                          key={p}
                          onClick={() => setPrecisionFilter(p)}
                          className={`flex items-center justify-center gap-1 px-1 py-1.5 transition ${
                            idx > 0 ? "border-l border-panel-border" : ""
                          } ${
                            on
                              ? "bg-accent text-white"
                              : "text-foreground/70 hover:bg-panel-border"
                          }`}
                        >
                          {p !== "all" && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: precisionColor(p) }}
                            />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-panel-border px-4 py-3">
                  <button
                    onClick={() => setFavoritesOnly((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-foreground/80">
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 ${
                          favoritesOnly ? "text-yellow-400" : "text-foreground/50"
                        }`}
                        fill={favoritesOnly ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                      </svg>
                      Favorites only
                    </span>
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                        favoritesOnly ? "bg-accent" : "bg-panel-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          favoritesOnly ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex overflow-hidden rounded-md border border-panel-border">
            {(["all", "Attack", "Defense"] as SideFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSide(s);
                  setAgent("all");
                }}
                className={`px-3 py-2 text-sm transition ${
                  side === s
                    ? "bg-accent text-white"
                    : "bg-panel text-foreground/70 hover:bg-panel-border"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent picker — hidden when a global agent focus is active (the view is
          already locked to that agent). */}
      {!agentFocused && (
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAgent("all")}
          className={`h-11 rounded-full border-2 px-4 text-sm font-semibold transition ${
            agent === "all"
              ? "border-accent bg-accent text-white"
              : "border-panel-border bg-panel text-foreground/70 hover:border-accent/60"
          }`}
        >
          All
        </button>
        {agentsHere.map((a) => {
          const count = counts[a.slug] ?? 0;
          const active = agent === a.slug;
          return (
            <button
              key={a.slug}
              onClick={() => setAgent(a.slug)}
              title={a.name}
              className={`relative h-11 w-11 rounded-full border-2 transition ${
                active
                  ? "border-accent"
                  : "border-panel-border hover:border-accent/60"
              }`}
            >
              <span className="block h-full w-full overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.icon}
                  alt={a.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </span>
              <span className="absolute -bottom-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-panel bg-accent px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            </button>
          );
        })}
      </div>
      )}

      <div className="mx-auto max-w-3xl">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-panel-border bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={map?.minimap}
            alt={`${map?.name ?? mapSlug} minimap`}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ transform: `rotate(${rot}deg)` }}
            draggable={false}
          />

          {showCallouts && (
            <MinimapCallouts slug={mapSlug} callouts={callouts} />
          )}

          {/* Trajectory lines from each start to its landing spot. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {lines.map((s, i) => {
              const f = rotatePoint(s.fx, s.fy, rot);
              const t = rotatePoint(s.tx, s.ty, rot);
              return (
                <line
                  key={i}
                  x1={f.x * 100}
                  y1={f.y * 100}
                  x2={t.x * 100}
                  y2={t.y * 100}
                  stroke={sideAccent}
                  strokeWidth={0.45}
                  strokeDasharray="2 1.5"
                  opacity={0.55}
                />
              );
            })}
          </svg>

          {/* Landing markers. A cluster renders as one teal circle with the
              count centered inside it (no separate badge, so it never looks
              like two stacked dots). */}
          {landingClusters.map((c, ci) => {
            const t = rotatePoint(c.x, c.y, rot);
            const many = c.items.length > 1;
            return (
              <span
                key={`to-${ci}`}
                className={`pointer-events-none absolute z-[3] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 text-[9px] font-bold text-black ${
                  many ? "h-4 w-4" : "h-3 w-3"
                }`}
                style={{
                  left: `${t.x * 100}%`,
                  top: `${t.y * 100}%`,
                  background: "#38e0c8",
                }}
              >
                {many ? c.items.length : null}
              </span>
            );
          })}

          {/* Throw markers (clustered by proximity) */}
          {clusters.map((c, ci) => {
            const first = c.items[0];
            const a = getAgent(first.agentSlug);
            const many = c.items.length > 1;
            const p = rotatePoint(c.x, c.y, rot);
            // Ring encodes precision: a solid color when uniform, or proportional
            // arcs (conic-gradient) when a cluster mixes precision levels.
            const precisions = new Set(
              c.items.map((l) => l.precision ?? "unset"),
            );
            const uniform = precisions.size === 1 ? first.precision : undefined;
            // Inner disc encodes side: red for Attack, blue for Defense (neutral
            // when a cluster somehow mixes sides).
            const sidesHere = new Set(c.items.map((l) => l.side));
            const markerSide = sidesHere.size === 1 ? first.side : undefined;
            // Muted so they don't fight the (brighter) precision ring colors.
            const innerColor =
              markerSide === "Defense"
                ? "#35678f"
                : markerSide === "Attack"
                  ? "#a83a48"
                  : "#0f1115";
            return (
              <button
                key={ci}
                onClick={() => (many ? setCluster(c.items) : setSelected(first))}
                title={
                  many
                    ? `${c.items.length} lineups here${
                        uniform ? ` — ${uniform} precision` : ""
                      }`
                    : `${a?.name ?? first.agentSlug} — ${first.title}${
                        first.precision
                          ? ` (${first.precision} precision)`
                          : ""
                      }`
                }
                className="absolute z-[5] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition hover:z-10 hover:scale-110"
                style={{
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  background: precisionRing(c.items),
                }}
              >
                <span
                  className="absolute inset-[3px] flex items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white"
                  style={{ background: innerColor }}
                >
                  {a?.icon ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.icon}
                      alt={a.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    (a?.name ?? "?").slice(0, 2)
                  )}
                </span>
                {many && (
                  <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-background px-1 text-[9px] font-bold text-white">
                    {c.items.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-sm text-foreground/50">
          {shown.length === 0
            ? "No positioned lineups here yet. Add coordinates when creating or editing a lineup."
            : `${shown.length} lineup${shown.length === 1 ? "" : "s"} on this view — teal dots mark where they land`}
        </p>
      </div>

      {cluster && (
        <ClusterModal
          lineups={cluster}
          onPick={(l) => {
            setCluster(null);
            setSelected(l);
          }}
          onClose={() => setCluster(null)}
          canEdit={canEdit}
          onEdit={(l) => {
            setCluster(null);
            onEdit?.(l);
          }}
        />
      )}

      {selected && (
        <MinimapDetail
          lineup={selected}
          onClose={() => setSelected(null)}
          canEdit={canEdit}
          onRefresh={onRefresh}
          onEdit={
            onEdit
              ? (l) => {
                  setSelected(null);
                  onEdit(l);
                }
              : undefined
          }
          onDelete={
            onDelete
              ? (l) => {
                  setSelected(null);
                  onDelete(l);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// Group a lineup subset's landing spots by proximity (merging against any
// member so chains collapse), returning one centroid per group with its items.
// Agglomerative proximity clustering: repeatedly merges the two closest groups
// until no two cluster centers sit within `th`. This guarantees final markers
// never visually stack (a plain single-pass grouping can leave two centroids
// close enough that their dots overlap).
function agglomerate(
  entries: { x: number; y: number; item: Lineup }[],
  th: number,
): { x: number; y: number; items: Lineup[] }[] {
  const groups = entries.map((e) => ({
    pts: [{ x: e.x, y: e.y }],
    items: [e.item],
  }));
  const centroid = (g: { pts: { x: number; y: number }[] }) => ({
    x: g.pts.reduce((s, p) => s + p.x, 0) / g.pts.length,
    y: g.pts.reduce((s, p) => s + p.y, 0) / g.pts.length,
  });
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < groups.length && !merged; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const ci = centroid(groups[i]);
        const cj = centroid(groups[j]);
        if (Math.hypot(ci.x - cj.x, ci.y - cj.y) < th) {
          groups[i].pts.push(...groups[j].pts);
          groups[i].items.push(...groups[j].items);
          groups.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  return groups.map((g) => ({ ...centroid(g), items: g.items }));
}

function clusterLandings(
  items: Lineup[],
  th = 0.06,
): { x: number; y: number; items: Lineup[] }[] {
  return agglomerate(
    items
      .filter((l) => l.toX != null && l.toY != null)
      .map((l) => ({ x: l.toX!, y: l.toY!, item: l })),
    th,
  );
}

function ClusterModal({
  lineups,
  onPick,
  onClose,
  canEdit = false,
  onEdit,
}: {
  lineups: Lineup[];
  onPick: (l: Lineup) => void;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (l: Lineup) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border border-panel-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-border p-4">
          <h2 className="font-semibold">
            {lineups.length} lineups from this spot
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-foreground/60 hover:text-accent"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="divide-y divide-panel-border">
          {lineups.map((l) => {
            const a = getAgent(l.agentSlug);
            return (
              <div
                key={l.id}
                className="flex items-center gap-2 pr-2 hover:bg-panel-border"
              >
                <button
                  onClick={() => onPick(l)}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                >
                  {a?.icon && (
                    <span className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.icon}
                        alt={a.name}
                        className="h-9 w-9 rounded-full border border-panel-border object-cover"
                      />
                      {l.precision && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel"
                          style={{ background: precisionColor(l.precision) }}
                          title={`${l.precision} precision`}
                        />
                      )}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold uppercase tracking-wide text-accent">
                      {a?.name ?? l.agentSlug}
                      {l.ability ? ` • ${l.ability}` : ""}
                    </span>
                    <span className="block truncate text-sm font-medium">
                      {l.title}
                    </span>
                    {l.site && (
                      <span className="block text-xs text-foreground/50">
                        {l.site === "Mid" ? "Mid" : `${l.site} Site`}
                      </span>
                    )}
                  </span>
                </button>
                {canEdit && onEdit && (
                  <button
                    onClick={() => onEdit(l)}
                    className="rounded p-1.5 text-foreground/60 hover:text-accent"
                    aria-label="Edit lineup"
                    title="Edit lineup"
                  >
                    ✎
                  </button>
                )}
                <FavoriteStar id={l.id} size="sm" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MinimapDetail({
  lineup,
  onClose,
  canEdit = false,
  onEdit,
  onDelete,
  onRefresh,
}: {
  lineup: Lineup;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (l: Lineup) => void;
  onDelete?: (l: Lineup) => void;
  onRefresh?: () => void;
}) {
  const agent = getAgent(lineup.agentSlug);
  const editor = useAnnotatableSteps(lineup.steps ?? [], {
    lineupId: lineup.id,
    onSaved: onRefresh,
  });
  const steps = editor.steps;
  const hasSteps = steps.some((s) => s.image || s.caption.trim());
  const { pro } = useProMode();
  // Pro mode: quick reference shows just the aim step(s) in the inline preview.
  const stepIdx = pro ? proStepIndices(steps) : steps.map((_, i) => i);
  const displaySteps = stepIdx.map((i) => steps[i]);
  const { stepOverlays, placedBothDarts, isSova, isDouble } =
    buildCardDartOverlays(lineup, "full");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Log to the local "recently viewed" history whenever this detail opens.
  useEffect(() => {
    recordView(lineup.id);
  }, [lineup.id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(lineupLink(lineup));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — non-critical.
    }
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    if (lightboxIdx === null || editor.annotating) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setLightboxIdx(null);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightboxIdx, editor.annotating]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-panel-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {copied && (
          <div className="pointer-events-none absolute right-4 top-16 z-20 rounded bg-black/80 px-2 py-1 text-xs text-white">
            Link copied
          </div>
        )}
        <div className="flex items-start justify-between gap-3 border-b border-panel-border p-5">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              {agent?.name ?? lineup.agentSlug}
              {lineup.ability ? ` • ${lineup.ability}` : ""} • {lineup.side}
              {lineup.site
                ? ` • ${lineup.site === "Mid" ? "Mid" : `${lineup.site} Site`}`
                : ""}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-xl font-bold">{lineup.title}</h2>
              <FavoriteStar id={lineup.id} size="sm" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div ref={menuRef} className="relative">
              <button
                aria-label="Lineup options"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-foreground/70 hover:bg-panel-border hover:text-accent"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-panel-border bg-panel shadow-lg">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      copyLink();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-panel-border"
                  >
                    {copied ? "✓ Copied" : "Copy link"}
                  </button>
                  {canEdit && onEdit && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(lineup);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-panel-border"
                    >
                      Edit
                    </button>
                  )}
                  {canEdit && onDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(lineup);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-panel-border"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-foreground/60 hover:bg-panel-border hover:text-accent"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="space-y-5 p-5">
          {lineup.agentSlug === "sova" &&
            (lineup.charge != null || lineup.jump || lineup.ability) && (
              <SovaIndicator
                ability={lineup.ability}
                charge={lineup.charge}
                bounces={lineup.bounces}
                jump={lineup.jump}
                variant="full"
              />
            )}
          <LineupTags lineup={lineup} />
          {lineup.notes && (
            <p className="whitespace-pre-line text-foreground/80">
              {lineup.notes}
            </p>
          )}
          {hasSteps ? (
            <StepCarousel
              steps={displaySteps}
              enableKeyboard
              onImageClick={(idx) => setLightboxIdx(stepIdx[idx])}
            />
          ) : (
            <p className="text-sm text-foreground/50">
              No steps attached to this lineup yet.
            </p>
          )}
        </div>
      </div>

      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxIdx(null);
          }}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-9 right-0 flex items-center gap-4">
              {canEdit && editor.canAnnotate && (
                <button
                  onClick={() => editor.setAnnotating(true)}
                  aria-label="Annotate this image"
                  title="Draw on this image"
                  className="flex items-center gap-1 text-sm text-white/70 hover:text-white"
                >
                  ✎ Edit
                  {editor.saving && (
                    <span className="text-white/40">saving…</span>
                  )}
                </button>
              )}
              <button
                onClick={() => setLightboxIdx(null)}
                aria-label="Close preview"
                className="flex items-center gap-1 text-sm text-white/70 hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <div className="relative">
              <StepCarousel
                steps={steps}
                overlays={stepOverlays}
                enableKeyboard
                enableZoom
                initialIndex={lightboxIdx}
                onIndexChange={editor.setCurrent}
              />
              <LineupOverlayBadges
                lineup={lineup}
                isSova={isSova}
                isDouble={isDouble}
                placedBothDarts={placedBothDarts}
                reserveKebab={false}
                big
              />
            </div>
            <LineupTags
              lineup={lineup}
              className="mt-3 justify-center"
            />
          </div>
        </div>
      )}

      {editor.annotating && editor.step?.image && (
        <ImageAnnotator
          src={editor.step.image}
          initialAnnotations={editor.step.annotations}
          onCancel={() => editor.setAnnotating(false)}
          onApply={editor.apply}
        />
      )}
    </div>
  );
}
