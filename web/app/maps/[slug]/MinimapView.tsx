"use client";

import { useEffect, useMemo, useState } from "react";
import { getAgent, AGENTS } from "@/lib/agents";
import { getMap } from "@/lib/maps";
import type { Lineup } from "@/lib/types";
import StepCarousel from "@/app/components/StepCarousel";
import { SovaIndicator } from "@/app/components/SovaIndicator";
import LineupTags from "@/app/components/LineupTags";
import FavoriteStar from "@/app/components/FavoriteStar";
import MinimapCallouts from "@/app/components/MinimapCallouts";
import { attackerBottomRotation, rotatePoint } from "@/lib/callouts";

type Side = "Attack" | "Defense";
type SideFilter = Side | "all";

// Spatial "where is it thrown from" view for a single map. Reads only the
// lineups already scoped to this map by the server component.
export default function MinimapView({
  mapSlug,
  lineups,
  canEdit = false,
  onEdit,
  onDelete,
}: {
  mapSlug: string;
  lineups: Lineup[];
  canEdit?: boolean;
  onEdit?: (l: Lineup) => void;
  onDelete?: (l: Lineup) => void;
}) {
  const [side, setSide] = useState<SideFilter>("all");
  const [agent, setAgent] = useState<string>("all");
  const [selected, setSelected] = useState<Lineup | null>(null);
  const [cluster, setCluster] = useState<Lineup[] | null>(null);
  const [showCallouts, setShowCallouts] = useState(true);

  const map = getMap(mapSlug);

  // Lineups on this side that have a placed throw position.
  const placed = useMemo(
    () =>
      lineups.filter(
        (l) =>
          (side === "all" || l.side === side) &&
          l.fromX != null &&
          l.fromY != null,
      ),
    [lineups, side],
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

  // Landing spots grouped by proximity. In "all" mode many agents' landings
  // pile up, so merge with a wider radius to avoid stacked dots; a single-agent
  // filter uses a tighter radius so distinct spots stay separate.
  const landingClusters = useMemo(
    () => clusterLandings(shown, agent === "all" ? 0.09 : 0.06),
    [shown, agent],
  );

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
  const rot = attackerBottomRotation(mapSlug);

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

      {/* Agent picker */}
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

          {showCallouts && <MinimapCallouts slug={mapSlug} />}

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
            return (
              <button
                key={ci}
                onClick={() => (many ? setCluster(c.items) : setSelected(first))}
                title={
                  many
                    ? `${c.items.length} lineups here`
                    : `${a?.name ?? first.agentSlug} — ${first.title}`
                }
                className="absolute z-[5] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-lg transition hover:z-10 hover:scale-110"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              >
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white">
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
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.icon}
                      alt={a.name}
                      className="h-9 w-9 shrink-0 rounded-full border border-panel-border object-cover"
                    />
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
}: {
  lineup: Lineup;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (l: Lineup) => void;
  onDelete?: (l: Lineup) => void;
}) {
  const agent = getAgent(lineup.agentSlug);
  const steps = lineup.steps ?? [];
  const hasSteps = steps.some((s) => s.image || s.caption.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-panel-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-panel-border p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              {agent?.name ?? lineup.agentSlug}
              {lineup.ability ? ` • ${lineup.ability}` : ""} • {lineup.side}
              {lineup.site
                ? ` • ${lineup.site === "Mid" ? "Mid" : `${lineup.site} Site`}`
                : ""}
            </div>
            <h2 className="mt-1 text-xl font-bold">{lineup.title}</h2>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(lineup)}
                className="rounded px-2 py-1 text-sm text-foreground/70 hover:text-accent"
                aria-label="Edit lineup"
                title="Edit lineup"
              >
                ✎ Edit
              </button>
            )}
            {canEdit && onDelete && (
              <button
                onClick={() => onDelete(lineup)}
                className="rounded px-2 py-1 text-sm text-foreground/70 hover:text-accent"
                aria-label="Delete lineup"
                title="Delete lineup"
              >
                Delete
              </button>
            )}
            <FavoriteStar id={lineup.id} size="sm" />
            <button
              onClick={onClose}
              className="rounded p-1 text-foreground/60 hover:text-accent"
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
            <StepCarousel steps={steps} enableKeyboard />
          ) : (
            <p className="text-sm text-foreground/50">
              No steps attached to this lineup yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
