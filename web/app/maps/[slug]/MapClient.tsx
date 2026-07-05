"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AGENTS, getAgent } from "@/lib/agents";
import { MAPS, getMapSites } from "@/lib/maps";
import type { Lineup } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import StepsEditor from "@/app/components/StepsEditor";
import SovaFields from "@/app/components/SovaFields";
import MechanicsFields from "@/app/components/MechanicsFields";
import SiteFields from "@/app/components/SiteFields";
import MinimapPicker from "@/app/components/MinimapPicker";
import MinimapView from "./MinimapView";
import LineupTags from "@/app/components/LineupTags";
import FavoriteStar from "@/app/components/FavoriteStar";
import { SovaIndicator } from "@/app/components/SovaIndicator";
import StepCarousel from "@/app/components/StepCarousel";
import AnnotatedImage from "@/app/components/AnnotatedImage";
import ImageAnnotator from "@/app/components/ImageAnnotator";
import { useAnnotatableSteps } from "@/app/components/useAnnotatableSteps";

// Build a shareable deep link that opens a specific lineup on its map.
export function lineupLink(l: Lineup): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/maps/${l.mapSlug}?side=${l.side}&lineup=${l.id}`;
}

type Side = "Attack" | "Defense";

// Site filter chips shown in the map header, derived per-map so three-site
// maps (Haven, Lotus) expose a "C Site" chip too.
function siteFiltersFor(mapSlug: string): { id: string; label: string }[] {
  return [
    { id: "all", label: "All" },
    ...getMapSites(mapSlug).map((s) => ({
      id: s,
      label: s === "Mid" ? "Mid" : `${s} Site`,
    })),
  ];
}

function matchesSite(site: string | undefined, filter: string): boolean {
  return filter === "all" || site === filter;
}

// Flatten a lineup into one lowercase searchable string spanning its tags,
// text and step captions so the map search can match on anything meaningful.
function lineupHaystack(l: Lineup): string {
  const parts: (string | undefined)[] = [
    l.title,
    l.notes,
    l.ability,
    l.site,
    l.site === "Mid" ? "mid" : l.site ? `${l.site} site` : undefined,
    l.plantSpot,
    l.side,
    getAgent(l.agentSlug)?.name,
    l.agentSlug,
    l.doubleShock ? "double shock" : undefined,
    l.jump || l.jump2 ? "jump" : undefined,
    l.crouch ? "crouch" : undefined,
    l.precision ? `${l.precision} precision` : undefined,
    ...(l.steps?.map((s) => s.caption) ?? []),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export default function MapClient({
  mapSlug,
  mapName,
  mapImage,
  lineups,
  canEdit,
}: {
  mapSlug: string;
  mapName: string;
  mapImage: string;
  lineups: Lineup[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  // Seed initial state from the URL so shared/bookmarked deep links restore the
  // exact view (map is already in the path; side/agent/site/search/lineup here).
  const initialAllSide: "all" | Side = (() => {
    const s = params.get("side");
    return s === "Attack" || s === "Defense" ? s : "all";
  })();
  // Default to the spatial minimap view; only fall to the list when the URL
  // explicitly asks for it (e.g. a shared list/lineup deep link).
  const [view, setView] = useState<"list" | "minimap">(
    params.get("view") === "list" ? "list" : "minimap",
  );
  const [agent, setAgent] = useState<string>(params.get("agent") || "all");
  const [siteFilter, setSiteFilter] = useState<string>(
    params.get("site") || "all",
  );
  const [doubleShockOnly, setDoubleShockOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState(params.get("q") || "");
  // The list view always shows all lineups; Attack/Defense act as filters.
  const [allSideFilter, setAllSideFilter] = useState<"all" | Side>(
    initialAllSide,
  );
  const [viewing, setViewing] = useState<Lineup | null>(null);
  const [editing, setEditing] = useState<Lineup | null>(null);
  const [deleting, setDeleting] = useState<Lineup | null>(null);

  const { favorites, isFavorite } = useFavorites();

  // On first load, if the URL points at a specific lineup, open it in the list
  // view (where the detail modal lives).
  useEffect(() => {
    const id = params.get("lineup");
    if (!id) return;
    const l = lineups.find((x) => x.id === id);
    if (!l) return;
    setView("list");
    setViewing(l);
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address bar in sync with the current view so it's always ready to
  // copy/share. Uses replaceState (not the router) to avoid re-fetching.
  useEffect(() => {
    const p = new URLSearchParams();
    if (view === "list") p.set("view", "list");
    if (allSideFilter !== "all") p.set("side", allSideFilter);
    if (agent !== "all") p.set("agent", agent);
    if (siteFilter !== "all") p.set("site", siteFilter);
    if (query.trim()) p.set("q", query.trim());
    if (viewing) p.set("lineup", viewing.id);
    const qs = p.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [view, allSideFilter, agent, siteFilter, query, viewing]);

  const sideAccent = allSideFilter === "Defense" ? "#38bdf8" : "#ff4655";
  const siteFilters = siteFiltersFor(mapSlug);

  const sideLineups = useMemo(
    () =>
      allSideFilter === "all"
        ? lineups
        : lineups.filter((l) => l.side === allSideFilter),
    [lineups, allSideFilter],
  );

  // Lineups for the current side AND site filter — drives both the agent chips
  // and the grid, so agents with no lineups on the chosen site drop out.
  const siteLineups = useMemo(
    () => sideLineups.filter((l) => matchesSite(l.site, siteFilter)),
    [sideLineups, siteFilter],
  );

  const agentsWithLineups = useMemo(() => {
    const set = new Set(siteLineups.map((l) => l.agentSlug));
    return AGENTS.filter((a) => set.has(a.slug));
  }, [siteLineups]);

  // If the selected agent no longer has lineups for this site, fall back to All.
  useEffect(() => {
    if (agent !== "all" && !agentsWithLineups.some((a) => a.slug === agent)) {
      setAgent("all");
    }
  }, [agent, agentsWithLineups]);

  const hasDoubleShock = useMemo(
    () => siteLineups.some((l) => l.doubleShock),
    [siteLineups],
  );

  // Drop the Double Shock filter if the current view has none.
  useEffect(() => {
    if (doubleShockOnly && !hasDoubleShock) setDoubleShockOnly(false);
  }, [doubleShockOnly, hasDoubleShock]);

  // Remember the current map/side/agent so the header "+ Add Lineup" button can
  // prefill the Add form with whatever the user is currently viewing.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "addLineupContext",
        JSON.stringify({
          map: mapSlug,
          side: allSideFilter === "all" ? undefined : allSideFilter,
          agent,
        }),
      );
    } catch {
      // Storage unavailable (private mode etc.) — non-critical.
    }
  }, [mapSlug, allSideFilter, agent]);

  // Favorites present in the current side/site slice — drives whether to show
  // the Favorites chip at all.
  const hasFavoritesHere = useMemo(
    () => siteLineups.some((l) => isFavorite(l.id)),
    [siteLineups, isFavorite],
  );

  useEffect(() => {
    if (favoritesOnly && !hasFavoritesHere) setFavoritesOnly(false);
  }, [favoritesOnly, hasFavoritesHere]);

  const filtered = useMemo(() => {
    let out =
      agent === "all"
        ? siteLineups
        : siteLineups.filter((l) => l.agentSlug === agent);
    if (doubleShockOnly) out = out.filter((l) => l.doubleShock);
    if (favoritesOnly) out = out.filter((l) => isFavorite(l.id));
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      out = out.filter((l) => {
        const hay = lineupHaystack(l);
        return terms.every((t) => hay.includes(t));
      });
    }
    return out;
  }, [agent, siteLineups, doubleShockOnly, favoritesOnly, favorites, query]);

  return (
    <div
      style={
        {
          "--accent": sideAccent,
          "--color-accent": sideAccent,
        } as React.CSSProperties
      }
    >
      {/* Map banner with the site filter inline next to the map name. */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mapImage}
          alt={mapName}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-6xl px-4 pb-6">
          <Link
            href="/"
            className="text-sm text-foreground/70 hover:text-accent"
          >
            &larr; All maps
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h1 className="font-display text-3xl tracking-widest sm:text-5xl">{mapName}</h1>
            <div className="flex flex-wrap items-center justify-end gap-3 pb-1.5">
              {view === "list" && (
                <div className="flex flex-wrap items-center gap-2">
                  {siteFilters.map((s) => (
                    <FilterChip
                      key={s.id}
                      label={s.label}
                      active={siteFilter === s.id}
                      onClick={() => setSiteFilter(s.id)}
                    />
                  ))}
                </div>
              )}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {view === "minimap" ? (
          <div>
            <MinimapView
              mapSlug={mapSlug}
              lineups={lineups}
              canEdit={canEdit}
              onEdit={(l) => setEditing(l)}
              onDelete={(l) => setDeleting(l)}
              onRefresh={() => router.refresh()}
            />
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setAgent("all");
                  setSiteFilter("all");
                  setDoubleShockOnly(false);
                  setFavoritesOnly(false);
                  setQuery("");
                  setAllSideFilter("all");
                }}
                className="rounded-full border border-panel-border bg-panel px-6 py-2.5 text-sm font-semibold transition hover:border-accent/60 hover:text-accent"
              >
                See all lineups
                <span className="ml-2 text-foreground/40">{lineups.length}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl tracking-widest text-accent transition-colors duration-300">
                  {allSideFilter === "all" ? "All Lineups" : allSideFilter}
                </span>
                <span className="text-foreground/40">{mapName}</span>
              </div>
              <div className="flex overflow-hidden rounded-full border border-panel-border">
                {(["all", "Attack", "Defense"] as const).map((s) => {
                  const active = allSideFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setAllSideFilter(s)}
                      className={`px-4 py-1.5 text-sm transition ${
                        active
                          ? "bg-accent text-white"
                          : "bg-panel text-foreground/70 hover:bg-panel-border"
                      }`}
                    >
                      {s === "all" ? "All" : s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  label="All"
                  active={agent === "all"}
                  onClick={() => setAgent("all")}
                />
                {agentsWithLineups.map((a) => (
                  <FilterChip
                    key={a.slug}
                    label={a.name}
                    active={agent === a.slug}
                    onClick={() => setAgent(a.slug)}
                  />
                ))}
                {(hasDoubleShock || hasFavoritesHere) && (
                  <span className="mx-1 h-5 w-px self-center bg-panel-border" />
                )}
                {hasDoubleShock && (
                  <FilterChip
                    label="Double Shock"
                    active={doubleShockOnly}
                    onClick={() => setDoubleShockOnly((v) => !v)}
                  />
                )}
                {hasFavoritesHere && (
                  <FilterChip
                    label="★ Favorites"
                    active={favoritesOnly}
                    onClick={() => setFavoritesOnly((v) => !v)}
                  />
                )}
              </div>
              <LineupSearch value={query} onChange={setQuery} />
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-panel-border p-10 text-center">
                {query.trim() ? (
                  <p className="text-foreground/60">
                    No lineups match &ldquo;{query.trim()}&rdquo;.{" "}
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-accent hover:underline"
                    >
                      Clear search
                    </button>
                  </p>
                ) : (
                  <p className="text-foreground/60">
                    No {allSideFilter === "all" ? "" : `${allSideFilter} `}
                    lineups yet for {mapName}
                    {siteFilter !== "all"
                      ? ` on ${siteFilters.find((s) => s.id === siteFilter)?.label}`
                      : ""}
                    {agent !== "all" ? ` (${getAgent(agent)?.name})` : ""}.
                  </p>
                )}
                {!query.trim() && canEdit && (
                  <Link
                    href={`/admin?map=${mapSlug}${
                      allSideFilter !== "all" ? `&side=${allSideFilter}` : ""
                    }${agent !== "all" ? `&agent=${agent}` : ""}`}
                    className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-white"
                  >
                    + Add the first lineup
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((l) => (
                  <LineupCard
                    key={l.id}
                    lineup={l}
                    canEdit={canEdit}
                    onOpen={() => setViewing(l)}
                    onEdit={() => setEditing(l)}
                    onDelete={() => setDeleting(l)}
                    onSaved={() => router.refresh()}
                  />
                ))}
              </div>
            )}

            {viewing && (
              <LineupModal lineup={viewing} onClose={() => setViewing(null)} />
            )}
          </div>
        )}
      </div>

      {/* Edit/delete modals live at the root so they work from both the list
          and the minimap views. */}
      {editing && (
        <EditLineupModal
          lineup={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          onInstantSaved={() => router.refresh()}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          lineup={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "minimap";
  onChange: (v: "list" | "minimap") => void;
}) {
  const opts: { id: "list" | "minimap"; label: string }[] = [
    { id: "list", label: "List" },
    { id: "minimap", label: "Minimap" },
  ];
  return (
    <div className="flex overflow-hidden rounded-full border border-panel-border bg-panel/80 backdrop-blur">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-4 py-1.5 text-sm font-medium transition ${
            view === o.id
              ? "bg-accent text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition border ${
        active
          ? "bg-accent text-white border-accent"
          : "bg-panel text-foreground/70 border-panel-border hover:border-accent/60"
      }`}
    >
      {label}
    </button>
  );
}

function LineupSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search lineups…"
        className="w-full rounded-full border border-panel-border bg-panel py-1.5 pl-9 pr-8 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent/60 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-foreground/50 hover:bg-panel-border hover:text-foreground"
        >
          &times;
        </button>
      )}
    </div>
  );
}

// Which dart an "aim" step belongs to, based on its caption. null if the step
// isn't an aim step (or the dart can't be determined).
function dartOfCaption(caption: string): 1 | 2 | null {
  const c = caption.toLowerCase();
  if (!c.includes("aim")) return null;
  if (c.includes("second") || c.includes("2nd")) return 2;
  if (c.includes("first") || c.includes("1st")) return 1;
  return null;
}

// Build per-step dart indicators for double-shock lineups (card + lightbox).
function buildCardDartOverlays(
  lineup: Lineup,
  variant: "badge" | "full" = "badge",
): {
  stepOverlays?: (React.ReactNode | null)[];
  placedBothDarts: boolean;
  isSova: boolean;
  isDouble: boolean;
} {
  const steps = lineup.steps ?? [];
  const isSova = lineup.agentSlug === "sova";
  const isDouble = isSova && !!lineup.doubleShock;
  if (!isDouble || steps.length === 0) {
    return { placedBothDarts: false, isSova, isDouble };
  }
  let p1 = false;
  let p2 = false;
  const stepOverlays = steps.map((s, i) => {
    const dart = dartOfCaption(s.caption);
    if (dart === 2) {
      p2 = true;
      return (
        <SovaIndicator
          key={i}
          title={variant === "full" ? "Second Dart" : undefined}
          charge={lineup.charge2}
          bounces={lineup.bounces2}
          jump={lineup.jump2}
          variant={variant}
        />
      );
    }
    if (dart === 1) {
      p1 = true;
      return (
        <SovaIndicator
          key={i}
          title={variant === "full" ? "First Dart" : undefined}
          charge={lineup.charge}
          bounces={lineup.bounces}
          jump={lineup.jump}
          variant={variant}
        />
      );
    }
    return null;
  });
  const placedBothDarts = p1 && p2;
  return {
    stepOverlays: placedBothDarts ? stepOverlays : undefined,
    placedBothDarts,
    isSova,
    isDouble,
  };
}

// Tag badges + non-per-step dart indicators, overlaid on a step image.
function LineupOverlayBadges({
  lineup,
  isSova,
  isDouble,
  placedBothDarts,
  reserveKebab,
  big = false,
}: {
  lineup: Lineup;
  isSova: boolean;
  isDouble: boolean;
  placedBothDarts: boolean;
  reserveKebab: boolean;
  big?: boolean;
}) {
  const dartVariant = big ? "full" : "badge";
  return (
    <div
      className={`pointer-events-none absolute left-2 top-2 z-[5] flex flex-col items-start gap-1 ${
        reserveKebab ? "right-[4.75rem]" : "right-2"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded bg-black/70 px-2 py-0.5 text-xs">
          {lineup.side}
        </span>
        {lineup.site && (
          <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
            {lineup.site === "Mid" ? "Mid" : `${lineup.site} Site`}
          </span>
        )}
        {lineup.plantSpot && (
          <span className="rounded bg-black/70 px-2 py-0.5 text-xs">
            {lineup.plantSpot}
          </span>
        )}
        {lineup.doubleShock && (
          <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
            Double Shock
          </span>
        )}
        {lineup.jump && lineup.agentSlug !== "sova" && (
          <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
            Jump
          </span>
        )}
      </div>
      {isSova && !isDouble && (lineup.charge != null || lineup.jump) && (
        <SovaIndicator
          charge={lineup.charge}
          bounces={lineup.bounces}
          jump={lineup.jump}
          variant={dartVariant}
        />
      )}
      {isSova && isDouble && !placedBothDarts && (
        <div className="flex items-start gap-1">
          <SovaIndicator
            title={big ? "First Dart" : undefined}
            charge={lineup.charge}
            bounces={lineup.bounces}
            jump={lineup.jump}
            variant={dartVariant}
          />
          <SovaIndicator
            title={big ? "Second Dart" : undefined}
            charge={lineup.charge2}
            bounces={lineup.bounces2}
            jump={lineup.jump2}
            variant={dartVariant}
          />
        </div>
      )}
    </div>
  );
}

// Full-screen carousel lightbox opened by clicking a card's image.
function LineupLightbox({
  lineup,
  onClose,
  canEdit = false,
  onSaved,
}: {
  lineup: Lineup;
  onClose: () => void;
  canEdit?: boolean;
  onSaved?: () => void;
}) {
  const { stepOverlays, placedBothDarts, isSova, isDouble } =
    buildCardDartOverlays(lineup, "full");
  const editor = useAnnotatableSteps(lineup.steps ?? [], {
    lineupId: lineup.id,
    onSaved,
  });

  useEffect(() => {
    if (editor.annotating) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editor.annotating]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl"
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
              {editor.saving && <span className="text-white/40">saving…</span>}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            ✕ Close
          </button>
        </div>
        <div className="relative">
          <StepCarousel
            steps={editor.steps}
            overlays={stepOverlays}
            enableKeyboard
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
      </div>

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

function LineupCard({
  lineup,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
  onSaved,
}: {
  lineup: Lineup;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaved?: () => void;
}) {
  const agent = getAgent(lineup.agentSlug);
  const steps = lineup.steps ?? [];
  const hasSteps = steps.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(lineupLink(lineup));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — ignore.
    }
  }

  const { stepOverlays, placedBothDarts, isSova, isDouble } =
    buildCardDartOverlays(lineup);

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

  return (
    <div className="relative rounded-lg border border-panel-border bg-panel overflow-hidden hover:border-accent/60 transition">
      {/* Favorite star + options menu (star & Preview/Copy for everyone). */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <FavoriteStar id={lineup.id} />
        <div ref={menuRef} className="relative">
          <button
            aria-label="Lineup options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg leading-none hover:bg-black/80"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 overflow-hidden rounded-md border border-panel-border bg-panel shadow-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setLightbox(true);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-panel-border"
              >
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  copyLink();
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-panel-border"
              >
                Copy link
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-panel-border"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-panel-border"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {copied && (
        <div className="pointer-events-none absolute right-2 top-12 z-20 rounded bg-black/80 px-2 py-1 text-xs text-white">
          Link copied
        </div>
      )}

      {/* Media preview: step carousel with captions */}
      <div className="relative">
        {hasSteps ? (
          <StepCarousel
            steps={steps}
            onImageClick={() => setLightbox(true)}
            enableKeyboard={false}
            overlays={stepOverlays}
          />
        ) : (
          <button
            onClick={onOpen}
            className="flex aspect-video w-full items-center justify-center bg-black/40 text-sm text-foreground/30"
          >
            No steps yet
          </button>
        )}

        {/* Overlays (non-interactive) */}
        <LineupOverlayBadges
          lineup={lineup}
          isSova={isSova}
          isDouble={isDouble}
          placedBothDarts={placedBothDarts}
          reserveKebab
        />
      </div>

      {lightbox && (
        <LineupLightbox
          lineup={lineup}
          onClose={() => setLightbox(false)}
          canEdit={canEdit}
          onSaved={onSaved}
        />
      )}

      <button onClick={onOpen} className="block w-full text-left">
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-accent font-semibold uppercase tracking-wide">
            <span>{agent?.name ?? lineup.agentSlug}</span>
            {lineup.ability && (
              <span className="text-foreground/40">• {lineup.ability}</span>
            )}
          </div>
          <h3 className="mt-1 font-semibold">{lineup.title}</h3>
          {lineup.notes && (
            <p className="mt-1 text-sm text-foreground/60 line-clamp-2">
              {lineup.notes}
            </p>
          )}
          <LineupTags lineup={lineup} className="mt-2" />
        </div>
      </button>
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  maxWidth = "max-w-3xl",
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-xl border border-panel-border bg-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Full dart-strength panels placed under their matching aim steps in the detail
// view. Returns per-step nodes (aligned to steps) and whether every dart was
// placed — if not, the caller shows a fallback panel at the top instead.
function buildDetailDartOverlays(lineup: Lineup): {
  overlays: (React.ReactNode | null)[];
  placedAll: boolean;
} {
  const steps = lineup.steps ?? [];
  const none = { overlays: steps.map(() => null), placedAll: false };
  if (lineup.agentSlug !== "sova") return none;

  if (lineup.doubleShock) {
    let p1 = false;
    let p2 = false;
    const overlays = steps.map((s, i) => {
      const dart = dartOfCaption(s.caption);
      if (dart === 2) {
        p2 = true;
        return (
          <SovaIndicator
            key={i}
            title="Second Dart"
            charge={lineup.charge2}
            bounces={lineup.bounces2}
            jump={lineup.jump2}
            variant="full"
          />
        );
      }
      if (dart === 1) {
        p1 = true;
        return (
          <SovaIndicator
            key={i}
            title="First Dart"
            charge={lineup.charge}
            bounces={lineup.bounces}
            jump={lineup.jump}
            variant="full"
          />
        );
      }
      return null;
    });
    return p1 && p2 ? { overlays, placedAll: true } : none;
  }

  // Single dart: place the strength under the first "aim" step.
  if (lineup.charge == null && !lineup.jump && !lineup.ability) return none;
  let placed = false;
  const overlays = steps.map((s, i) => {
    if (!placed && s.caption.toLowerCase().includes("aim")) {
      placed = true;
      return (
        <SovaIndicator
          key={i}
          ability={lineup.ability}
          charge={lineup.charge}
          bounces={lineup.bounces}
          jump={lineup.jump}
          variant="full"
        />
      );
    }
    return null;
  });
  return placed ? { overlays, placedAll: true } : none;
}

function LineupModal({
  lineup,
  onClose,
}: {
  lineup: Lineup;
  onClose: () => void;
}) {
  const agent = getAgent(lineup.agentSlug);
  const steps = lineup.steps ?? [];
  const hasVisibleSteps = steps.some((s) => s.image || s.caption.trim());
  const { overlays: detailOverlays, placedAll } =
    buildDetailDartOverlays(lineup);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(lineupLink(lineup));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — ignore.
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between border-b border-panel-border p-5">
        <div>
          <div className="text-xs text-accent font-semibold uppercase tracking-wide">
            {agent?.name ?? lineup.agentSlug}
            {lineup.ability ? ` • ${lineup.ability}` : ""} • {lineup.side}
            {lineup.site
              ? ` • ${lineup.site === "Mid" ? "Mid" : `${lineup.site} Site`}`
              : ""}
            {lineup.plantSpot ? ` • ${lineup.plantSpot} plant` : ""}
          </div>
          <h2 className="mt-1 text-xl font-bold">{lineup.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <FavoriteStar id={lineup.id} size="sm" />
          <button
            onClick={copyLink}
            className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-black/60"
            aria-label="Copy link"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-foreground/60 hover:text-accent"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {/* Dart strengths are shown under their aim steps below; only fall back
            to a top panel when we couldn't place them on a step. */}
        {!placedAll &&
          lineup.agentSlug === "sova" &&
          (lineup.doubleShock ? (
            <div className="flex flex-wrap gap-3">
              <SovaIndicator
                title="First Dart"
                charge={lineup.charge}
                bounces={lineup.bounces}
                jump={lineup.jump}
                variant="full"
              />
              <SovaIndicator
                title="Second Dart"
                charge={lineup.charge2}
                bounces={lineup.bounces2}
                jump={lineup.jump2}
                variant="full"
              />
            </div>
          ) : (
            (lineup.charge != null || lineup.jump || lineup.ability) && (
              <SovaIndicator
                ability={lineup.ability}
                charge={lineup.charge}
                bounces={lineup.bounces}
                jump={lineup.jump}
                variant="full"
              />
            )
          ))}
        <LineupTags lineup={lineup} />
        {lineup.notes && (
          <p className="text-foreground/80 whitespace-pre-line">
            {lineup.notes}
          </p>
        )}
        {!hasVisibleSteps ? (
          <p className="text-sm text-foreground/50">
            No steps attached to this lineup yet.
          </p>
        ) : (
          <div className="space-y-5">
            {steps.map((s, i) => (
              <figure key={i}>
                <figcaption className="mb-1.5 text-sm font-semibold text-accent">
                  <span className="mr-2 text-foreground/40">{i + 1}.</span>
                  {s.caption || `Step ${i + 1}`}
                </figcaption>
                {s.image && (
                  <AnnotatedImage
                    src={s.image}
                    annotations={s.annotations}
                    alt={s.caption || `Step ${i + 1}`}
                    fit="native"
                    className="w-full overflow-hidden rounded-lg border border-panel-border"
                  />
                )}
                {detailOverlays[i] && (
                  <div className="mt-2">{detailOverlays[i]}</div>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteModal({
  lineup,
  onClose,
  onDeleted,
}: {
  lineup: Lineup;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/lineups/${lineup.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-bold">Delete this lineup?</h2>
        <p className="mt-2 text-sm text-foreground/70">
          &ldquo;{lineup.title}&rdquo; will be permanently removed. This
          can&rsquo;t be undone.
        </p>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded border border-panel-border px-4 py-2 text-sm hover:bg-panel-border disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function EditLineupModal({
  lineup,
  onClose,
  onSaved,
  onInstantSaved,
}: {
  lineup: Lineup;
  onClose: () => void;
  onSaved: () => void;
  onInstantSaved?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agentSlug, setAgentSlug] = useState(lineup.agentSlug);
  const [mapSlug, setMapSlug] = useState(lineup.mapSlug);
  const [side, setSide] = useState<Side>(lineup.side);
  const abilities = getAgent(agentSlug)?.abilities ?? [];
  const abilityDefault = abilities.includes(lineup.ability)
    ? lineup.ability
    : "";
  const [ability, setAbility] = useState(abilityDefault);
  const [doubleShock, setDoubleShock] = useState(!!lineup.doubleShock);
  // Drop the selected ability if it isn't valid for a newly chosen agent.
  useEffect(() => {
    setAbility((prev) => (abilities.includes(prev) ? prev : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSlug]);
  const isDoubleShock =
    agentSlug === "sova" && ability === "Shock Dart" && doubleShock;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(e.currentTarget);
      const res = await fetch(`/api/lineups/${lineup.id}`, {
        method: "PATCH",
        body: data,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-panel-border p-5">
          <h2 className="text-lg font-bold">Edit Lineup</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/60 hover:text-accent"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Map">
              <select
                name="mapSlug"
                value={mapSlug}
                onChange={(e) => setMapSlug(e.target.value)}
                className={inputClass}
              >
                {MAPS.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Agent">
              <select
                name="agentSlug"
                value={agentSlug}
                onChange={(e) => setAgentSlug(e.target.value)}
                className={inputClass}
              >
                {AGENTS.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Title">
            <input
              name="title"
              defaultValue={lineup.title}
              required
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ability">
              <select
                name="ability"
                value={ability}
                onChange={(e) => setAbility(e.target.value)}
                disabled={!agentSlug}
                className={`${inputClass}${ability ? "" : " text-foreground/40"}`}
              >
                <option value="">
                  {agentSlug ? "Select an ability" : "Select an agent first"}
                </option>
                {abilities.map((ab) => (
                  <option key={ab} value={ab}>
                    {ab}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Side">
              <select
                name="side"
                value={side}
                onChange={(e) =>
                  setSide(e.target.value === "Defense" ? "Defense" : "Attack")
                }
                className={inputClass}
              >
                <option value="Attack">Attack</option>
                <option value="Defense">Defense</option>
              </select>
            </Field>
          </div>

          <SiteFields
            mapSlug={mapSlug}
            side={side}
            defaultSite={lineup.site}
            defaultPlantSpot={lineup.plantSpot}
          />

          <SovaFields
            show={agentSlug === "sova"}
            defaultCharge={lineup.charge}
            defaultBounces={lineup.bounces}
            defaultJump={lineup.jump}
            defaultCharge2={lineup.charge2}
            defaultBounces2={lineup.bounces2}
            defaultJump2={lineup.jump2}
            showDoubleShock={ability === "Shock Dart"}
            doubleShock={doubleShock}
            onDoubleShockChange={setDoubleShock}
          />

          <MechanicsFields
            agentSlug={agentSlug}
            defaults={{
              jump: lineup.jump,
              crouch: lineup.crouch,
              timeToLand: lineup.timeToLand,
              precision: lineup.precision,
            }}
          />

          {mapSlug && (
            <MinimapPicker
              key={mapSlug}
              mapSlug={mapSlug}
              defaultFrom={
                lineup.fromX != null && lineup.fromY != null
                  ? { x: lineup.fromX, y: lineup.fromY }
                  : undefined
              }
              defaultTo={
                lineup.toX != null && lineup.toY != null
                  ? { x: lineup.toX, y: lineup.toY }
                  : undefined
              }
            />
          )}

          <Field label="Notes / instructions">
            <textarea
              name="notes"
              rows={4}
              defaultValue={lineup.notes ?? ""}
              className={inputClass}
            />
          </Field>

          <StepsEditor
            initialSteps={lineup.steps}
            doubleShock={isDoubleShock}
            lineupId={lineup.id}
            onAnnotationsSaved={onInstantSaved}
          />

          {error && <p className="text-sm text-accent">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-panel-border p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded border border-panel-border px-4 py-2 text-sm hover:bg-panel-border disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const inputClass =
  "w-full rounded-md border border-panel-border bg-background px-3 py-2 outline-none focus:border-accent";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">
        {label}
      </span>
      {children}
    </label>
  );
}
