"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Lineup } from "@/lib/types";
import { getAgent } from "@/lib/agents";
import { getMap, MAPS } from "@/lib/maps";
import { useFavorites } from "@/lib/favorites";
import LineupTags from "@/app/components/LineupTags";
import FavoriteStar from "@/app/components/FavoriteStar";

// Personal "my go-tos" list. Favorites live in localStorage, so filtering and
// grouping happen client-side over the full lineup set from the server.
export default function FavoritesClient({ lineups }: { lineups: Lineup[] }) {
  const { favorites, ready } = useFavorites();

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const saved = useMemo(
    () => lineups.filter((l) => favSet.has(l.id)),
    [lineups, favSet],
  );

  // Group by map, ordered by the canonical MAPS order.
  const groups = useMemo(() => {
    const byMap = new Map<string, Lineup[]>();
    for (const l of saved) {
      const arr = byMap.get(l.mapSlug) ?? [];
      arr.push(l);
      byMap.set(l.mapSlug, arr);
    }
    return MAPS.map((m) => ({ map: m, items: byMap.get(m.slug) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [saved]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl tracking-widest">
          Favorites
        </h1>
        <p className="mt-2 text-foreground/60">
          Your saved go-to lineups, kept on this device.
        </p>
      </div>

      {!ready ? null : saved.length === 0 ? (
        <div className="rounded-lg border border-dashed border-panel-border p-12 text-center">
          <p className="text-foreground/60">
            No favorites yet. Tap the ☆ on any lineup to save it here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Browse maps
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.map.slug}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-xl tracking-widest text-foreground/80">
                  {g.map.name}
                </h2>
                <span className="h-px flex-1 bg-panel-border" />
                <span className="text-xs text-foreground/40">
                  {g.items.length}{" "}
                  {g.items.length === 1 ? "lineup" : "lineups"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {g.items.map((l) => (
                  <FavoriteCard key={l.id} lineup={l} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({ lineup }: { lineup: Lineup }) {
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
