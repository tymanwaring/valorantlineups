"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Lineup } from "@/lib/types";
import { getAgent } from "@/lib/agents";
import { getMap } from "@/lib/maps";
import { useRecent } from "@/lib/recent";
import LineupTags from "@/app/components/LineupTags";
import FavoriteStar from "@/app/components/FavoriteStar";

// Automatic "last used" history. IDs live in localStorage (most-recent first),
// so ordering and filtering happen client-side over the full lineup set.
export default function RecentClient({ lineups }: { lineups: Lineup[] }) {
  const { recent, ready, clear } = useRecent();

  const byId = useMemo(() => {
    const m = new Map<string, Lineup>();
    for (const l of lineups) m.set(l.id, l);
    return m;
  }, [lineups]);

  // Keep recency order; drop ids whose lineup no longer exists.
  const items = useMemo(
    () => recent.map((id) => byId.get(id)).filter((l): l is Lineup => !!l),
    [recent, byId],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-widest">
            Recently viewed
          </h1>
          <p className="mt-2 text-foreground/60">
            Your last-opened lineups, kept on this device.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="shrink-0 rounded-md border border-panel-border bg-panel px-3 py-2 text-sm text-foreground/70 transition hover:bg-panel-border"
          >
            Clear
          </button>
        )}
      </div>

      {!ready ? null : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-panel-border p-12 text-center">
          <p className="text-foreground/60">
            Nothing here yet. Open a lineup and it&apos;ll show up here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Browse maps
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((l) => (
            <RecentCard key={l.id} lineup={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentCard({ lineup }: { lineup: Lineup }) {
  const agent = getAgent(lineup.agentSlug);
  const map = getMap(lineup.mapSlug);
  const thumb = lineup.steps?.find((s) => s.image)?.image;
  const href = `/maps/${lineup.mapSlug}?side=${lineup.side}&lineup=${lineup.id}`;

  return (
    <div className="relative overflow-hidden rounded-lg border border-panel-border bg-panel transition hover:border-accent/60">
      <div className="absolute top-2 right-2 z-10">
        <FavoriteStar id={lineup.id} />
      </div>
      <Link href={href} className="block">
        <div className="relative aspect-video w-full bg-black/40">
          {thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumb}
              alt={lineup.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-foreground/30">
              No preview
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <span className="rounded bg-black/70 px-2 py-0.5 text-xs">
              {lineup.side}
            </span>
            {lineup.site && (
              <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
                {lineup.site === "Mid" ? "Mid" : `${lineup.site} Site`}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
            <span>{agent?.name ?? lineup.agentSlug}</span>
            {lineup.ability && (
              <span className="text-foreground/40">• {lineup.ability}</span>
            )}
            <span className="ml-auto text-foreground/40">
              {map?.name ?? lineup.mapSlug}
            </span>
          </div>
          <h3 className="mt-1 font-semibold">{lineup.title}</h3>
          <LineupTags lineup={lineup} className="mt-2" />
        </div>
      </Link>
    </div>
  );
}
