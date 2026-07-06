import Link from "next/link";
import Image from "next/image";
import { MAPS, type MapInfo } from "@/lib/maps";
import { getLineups } from "@/lib/store";
import { getRotation } from "@/lib/rotation";
import { canManage } from "@/lib/session";
import MapCardMenu from "@/app/components/MapCardMenu";
import MapCardCount from "@/app/components/MapCardCount";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lineups, rotation, canEdit] = await Promise.all([
    getLineups(),
    getRotation(),
    canManage(),
  ]);

  const counts = new Map<string, number>();
  const agentCounts = new Map<string, Record<string, number>>();
  for (const l of lineups) {
    counts.set(l.mapSlug, (counts.get(l.mapSlug) ?? 0) + 1);
    const rec = agentCounts.get(l.mapSlug) ?? {};
    rec[l.agentSlug] = (rec[l.agentSlug] ?? 0) + 1;
    agentCounts.set(l.mapSlug, rec);
  }

  const rotationSet = new Set(rotation);
  const inRotation = MAPS.filter((m) => rotationSet.has(m.slug));
  const outRotation = MAPS.filter((m) => !rotationSet.has(m.slug));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-widest">
            Select a Map
          </h1>
          <p className="mt-2 text-foreground/60">
            Choose a map to browse lineups by agent.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/admin/rotation"
            className="hidden shrink-0 rounded border border-panel-border bg-panel px-3 py-2 text-sm hover:border-accent/60 sm:block"
          >
            Edit rotation
          </Link>
        )}
      </div>

      <Section
        title="In Rotation"
        maps={inRotation}
        counts={counts}
        agentCounts={agentCounts}
        inRotation
        canEdit={canEdit}
      />

      {outRotation.length > 0 && (
        <Section
          title="Out of Rotation"
          maps={outRotation}
          counts={counts}
          agentCounts={agentCounts}
          inRotation={false}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function Section({
  title,
  maps,
  counts,
  agentCounts,
  inRotation,
  canEdit,
}: {
  title: string;
  maps: MapInfo[];
  counts: Map<string, number>;
  agentCounts: Map<string, Record<string, number>>;
  inRotation: boolean;
  canEdit: boolean;
}) {
  if (maps.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-xl tracking-widest text-foreground/80">
          {title}
        </h2>
        <span className="h-px flex-1 bg-panel-border" />
        <span className="text-xs text-foreground/40">{maps.length} maps</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {maps.map((map) => (
          <MapCard
            key={map.slug}
            map={map}
            count={counts.get(map.slug) ?? 0}
            byAgent={agentCounts.get(map.slug) ?? {}}
            inRotation={inRotation}
            canEdit={canEdit}
          />
        ))}
      </div>
    </section>
  );
}

function MapCard({
  map,
  count,
  byAgent,
  inRotation,
  canEdit,
}: {
  map: MapInfo;
  count: number;
  byAgent: Record<string, number>;
  inRotation: boolean;
  canEdit: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-panel aspect-video ${
        inRotation ? "border-panel-border" : "border-panel-border/50"
      }`}
    >
      <Image
        src={map.image}
        alt={map.name}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
          inRotation ? "" : "grayscale-[45%] opacity-75"
        }`}
      />
      {/* Rotation-aware scrim: in-rotation maps stay vibrant while out-of-
          rotation are pushed darker so bright splashes (e.g. Summit) match the
          moody ones. The bottom gradient adds extra label contrast. */}
      <div
        className={`absolute inset-0 ${inRotation ? "bg-black/30" : "bg-black/60"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {inRotation && (
        <span className="absolute top-2 left-2 rounded-full bg-accent/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          In Rotation
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
        <span className="font-display text-2xl tracking-widest drop-shadow">
          {map.name}
        </span>
        <MapCardCount total={count} byAgent={byAgent} />
      </div>

      {/* Stretched link covers the whole card for navigation; interactive
          overlays (the menu) sit above it with a higher z-index. */}
      <Link
        href={`/maps/${map.slug}`}
        aria-label={`Open ${map.name}`}
        className="absolute inset-0 z-[1]"
      />

      {canEdit && <MapCardMenu slug={map.slug} inRotation={inRotation} />}
    </div>
  );
}
