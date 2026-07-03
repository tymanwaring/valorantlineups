"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AGENTS, getAgent } from "@/lib/agents";
import { MAPS } from "@/lib/maps";
import type { Lineup } from "@/lib/types";
import StepsEditor from "@/app/components/StepsEditor";
import SovaFields from "@/app/components/SovaFields";
import JumpCheckbox from "@/app/components/JumpCheckbox";
import SiteFields from "@/app/components/SiteFields";
import { SovaIndicator } from "@/app/components/SovaIndicator";
import StepCarousel from "@/app/components/StepCarousel";

type Side = "Attack" | "Defense";
type View = Side | "all";

// Fixed site buckets shown as filter chips in the map header.
const SITE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "A", label: "A Site" },
  { id: "B", label: "B Site" },
  { id: "Mid", label: "Mid" },
];

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
  const [side, setSide] = useState<View | null>(null);
  const [switching, setSwitching] = useState(false);
  const [agent, setAgent] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [doubleShockOnly, setDoubleShockOnly] = useState(false);
  const [query, setQuery] = useState("");
  // Side filter used only within the combined "all" view.
  const [allSideFilter, setAllSideFilter] = useState<"all" | Side>("all");
  const [viewing, setViewing] = useState<Lineup | null>(null);
  const [editing, setEditing] = useState<Lineup | null>(null);
  const [deleting, setDeleting] = useState<Lineup | null>(null);

  function switchSide() {
    if (switching || !side || side === "all") return;
    setSwitching(true);
    const other: Side = side === "Attack" ? "Defense" : "Attack";
    // Swap content while the corroding disc fully covers the screen (~44%).
    window.setTimeout(() => {
      setSide(other);
      setAgent("all");
      setSiteFilter("all");
      setDoubleShockOnly(false);
      setQuery("");
      setAllSideFilter("all");
    }, 440);
    window.setTimeout(() => setSwitching(false), 1000);
  }

  const sideAccent = side === "Defense" ? "#38bdf8" : "#ff4655";

  const sideLineups = useMemo(
    () =>
      !side
        ? []
        : side === "all"
          ? allSideFilter === "all"
            ? lineups
            : lineups.filter((l) => l.side === allSideFilter)
          : lineups.filter((l) => l.side === side),
    [side, lineups, allSideFilter],
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
    if (!side) return;
    try {
      sessionStorage.setItem(
        "addLineupContext",
        JSON.stringify({
          map: mapSlug,
          side: side === "all" ? undefined : side,
          agent,
        }),
      );
    } catch {
      // Storage unavailable (private mode etc.) — non-critical.
    }
  }, [mapSlug, side, agent]);

  const filtered = useMemo(() => {
    let out =
      agent === "all"
        ? siteLineups
        : siteLineups.filter((l) => l.agentSlug === agent);
    if (doubleShockOnly) out = out.filter((l) => l.doubleShock);
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      out = out.filter((l) => {
        const hay = lineupHaystack(l);
        return terms.every((t) => hay.includes(t));
      });
    }
    return out;
  }, [agent, siteLineups, doubleShockOnly, query]);

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
            <h1 className="font-display text-5xl tracking-widest">{mapName}</h1>
            {side && (
              <div className="flex flex-wrap items-center gap-2 pb-1.5">
                {SITE_FILTERS.map((s) => (
                  <FilterChip
                    key={s.id}
                    label={s.label}
                    active={siteFilter === s.id}
                    onClick={() => setSiteFilter(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {!side ? (
          <SideSelect
            mapName={mapName}
            mapImage={mapImage}
            counts={{
              Attack: lineups.filter((l) => l.side === "Attack").length,
              Defense: lineups.filter((l) => l.side === "Defense").length,
            }}
            onChoose={(s) => {
              setSide(s);
              setAgent("all");
              setSiteFilter("all");
              setDoubleShockOnly(false);
              setQuery("");
              setAllSideFilter("all");
            }}
          />
        ) : (
          <div className="relative">
            {switching && <CorrodeTransition />}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl tracking-widest text-accent transition-colors duration-300">
                  {side === "all" ? "All Lineups" : side}
                </span>
                <span className="text-foreground/40">{mapName}</span>
              </div>
              {side === "all" ? (
                <div className="flex flex-wrap items-center gap-2">
                  {(["Attack", "Defense"] as Side[]).map((s) => {
                    const active = allSideFilter === s;
                    return (
                      <button
                        key={s}
                        onClick={() =>
                          setAllSideFilter((prev) => (prev === s ? "all" : s))
                        }
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${
                          active
                            ? "border-accent bg-accent text-white"
                            : "border-panel-border bg-panel hover:border-accent/60"
                        }`}
                      >
                        {s} only
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setSide("all");
                      setAllSideFilter("all");
                    }}
                    className="rounded-full border border-panel-border bg-panel px-4 py-1.5 text-sm hover:border-accent/60"
                  >
                    View all
                  </button>
                  <button
                    onClick={switchSide}
                    disabled={switching}
                    className="rounded-full border border-panel-border bg-panel px-4 py-1.5 text-sm hover:border-accent/60 disabled:opacity-60"
                  >
                    Switch to {side === "Attack" ? "Defense" : "Attack"}
                  </button>
                </div>
              )}
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
                {hasDoubleShock && (
                  <>
                    <span className="mx-1 h-5 w-px self-center bg-panel-border" />
                    <FilterChip
                      label="Double Shock"
                      active={doubleShockOnly}
                      onClick={() => setDoubleShockOnly((v) => !v)}
                    />
                  </>
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
                    No {side === "all" ? "" : `${side} `}lineups yet for{" "}
                    {mapName}
                    {siteFilter !== "all"
                      ? ` on ${SITE_FILTERS.find((s) => s.id === siteFilter)?.label}`
                      : ""}
                    {agent !== "all" ? ` (${getAgent(agent)?.name})` : ""}.
                  </p>
                )}
                {!query.trim() && canEdit && (
                  <Link
                    href={`/admin?map=${mapSlug}${side ? `&side=${side}` : ""}${
                      agent !== "all" ? `&agent=${agent}` : ""
                    }`}
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
                  />
                ))}
              </div>
            )}

            {viewing && (
              <LineupModal lineup={viewing} onClose={() => setViewing(null)} />
            )}

            {editing && (
              <EditLineupModal
                lineup={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  router.refresh();
                }}
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
        )}
      </div>
    </div>
  );
}

function SideSelect({
  mapName,
  mapImage,
  counts,
  onChoose,
}: {
  mapName: string;
  mapImage: string;
  counts: { Attack: number; Defense: number };
  onChoose: (side: View) => void;
}) {
  const total = counts.Attack + counts.Defense;
  return (
    <div>
      <div className="mb-5 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => onChoose("all")}
          className="w-full max-w-md rounded-xl border border-panel-border bg-panel px-8 py-4 text-lg font-semibold text-foreground transition hover:border-accent/60 hover:text-accent"
        >
          See all lineups
          <span className="ml-2 text-base text-foreground/40">{total}</span>
        </button>
        <div className="flex w-full max-w-md items-center gap-3 text-foreground/40">
          <span className="h-px flex-1 bg-panel-border" />
          <span className="text-xs uppercase tracking-[0.3em]">or</span>
          <span className="h-px flex-1 bg-panel-border" />
        </div>
      </div>

      <div className="side-split h-[62vh] min-h-[460px] w-full rounded-xl border border-panel-border">
      {/* Attack half */}
      <button
        type="button"
        aria-label="Choose Attack"
        onClick={() => onChoose("Attack")}
        className="side-half side-attack group"
      >
        <div
          className="side-bg"
          style={{ backgroundImage: `url(${mapImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff4655]/55 via-[#8a1f2a]/40 to-black/70" />
        <div className="relative z-10 pl-[8%] pr-[10%] text-left">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            Attacking
          </p>
          <h2 className="font-display text-6xl md:text-7xl tracking-widest text-white drop-shadow-[0_2px_20px_rgba(255,70,85,0.6)] transition-transform duration-500 group-hover:translate-x-2">
            ATTACK
          </h2>
          <p className="mt-3 max-w-xs text-sm text-white/70">
            Executes, smokes &amp; post-plant lineups.
          </p>
          <span className="mt-4 inline-block rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            {counts.Attack} {counts.Attack === 1 ? "lineup" : "lineups"}
          </span>
        </div>
      </button>

      {/* Defense half */}
      <button
        type="button"
        aria-label="Choose Defense"
        onClick={() => onChoose("Defense")}
        className="side-half side-defense group"
      >
        <div
          className="side-bg"
          style={{ backgroundImage: `url(${mapImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/45 via-cyan-900/40 to-black/70" />
        <div className="relative z-10 pr-[8%] pl-[10%] text-right">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            Defending
          </p>
          <h2 className="font-display text-6xl md:text-7xl tracking-widest text-white drop-shadow-[0_2px_20px_rgba(34,211,238,0.6)] transition-transform duration-500 group-hover:-translate-x-2">
            DEFENSE
          </h2>
          <p className="mt-3 ml-auto max-w-xs text-sm text-white/70">
            Retakes, holds &amp; anti-push setups.
          </p>
          <span className="mt-4 inline-block rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            {counts.Defense} {counts.Defense === 1 ? "lineup" : "lineups"}
          </span>
        </div>
      </button>

      {/* Vignette + prompt */}
      <div className="pointer-events-none absolute inset-0 z-[6] shadow-[inset_0_0_140px_60px_rgba(0,0,0,0.7)]" />
      <div className="pointer-events-none absolute inset-x-0 top-5 z-[7] text-center">
        <p className="font-display text-lg tracking-[0.35em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          {mapName.toUpperCase()}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]">
          Choose your side
        </p>
      </div>
      </div>
    </div>
  );
}

function CorrodeTransition() {
  return (
    <div className="corrode-overlay" aria-hidden>
      {/* Turbulence filter that gives the disc a corroding, dissolving edge. */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter
            id="corrode-filter"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.022"
              numOctaves="3"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="1s"
                values="0.014 0.022; 0.024 0.032; 0.014 0.022"
                repeatCount="1"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="70"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="corrode-fill" />
      <div className="corrode-core">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Swiftplay.webp"
          alt=""
          className="h-24 w-24 object-contain md:h-28 md:w-28"
        />
      </div>
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

function LineupCard({
  lineup,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
}: {
  lineup: Lineup;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const agent = getAgent(lineup.agentSlug);
  const steps = lineup.steps ?? [];
  const hasSteps = steps.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      {/* Kebab menu (admin only) */}
      {canEdit && (
      <div ref={menuRef} className="absolute top-2 right-2 z-10">
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
          <div className="absolute right-0 mt-1 w-32 overflow-hidden rounded-md border border-panel-border bg-panel shadow-lg">
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
          </div>
        )}
      </div>
      )}

      {/* Media preview: step carousel with captions */}
      <div className="relative">
        {hasSteps ? (
          <StepCarousel
            steps={steps}
            onImageClick={onOpen}
            enableKeyboard={false}
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
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
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
          {lineup.agentSlug === "sova" &&
            (lineup.charge != null || lineup.jump) && (
              <SovaIndicator
                charge={lineup.charge}
                bounces={lineup.bounces}
                jump={lineup.jump}
              />
            )}
        </div>
      </div>

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
        <button
          onClick={onClose}
          className="rounded p-1 text-foreground/60 hover:text-accent"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="p-5 space-y-5">
        {lineup.agentSlug === "sova" &&
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
        {lineup.jump && lineup.agentSlug !== "sova" && (
          <span className="inline-block rounded bg-accent/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Jump throw
          </span>
        )}
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
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={s.image}
                    alt={s.caption || `Step ${i + 1}`}
                    className="w-full rounded-lg border border-panel-border"
                  />
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
}: {
  lineup: Lineup;
  onClose: () => void;
  onSaved: () => void;
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
    <ModalShell onClose={onClose} maxWidth="max-w-xl">
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

          <JumpCheckbox
            show={!!agentSlug && agentSlug !== "sova"}
            defaultChecked={!!lineup.jump}
          />

          <Field label="Notes / instructions">
            <textarea
              name="notes"
              rows={4}
              defaultValue={lineup.notes ?? ""}
              className={inputClass}
            />
          </Field>

          <StepsEditor initialSteps={lineup.steps} doubleShock={isDoubleShock} />

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
