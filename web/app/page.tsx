import Link from "next/link";
import Image from "next/image";
import { MAPS, type MapInfo } from "@/lib/maps";
import { getLineups } from "@/lib/store";
import { getRotation } from "@/lib/rotation";
import { canManage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lineups, rotation, canEdit] = await Promise.all([
    getLineups(),
    getRotation(),
    canManage(),
  ]);

  const counts = new Map<string, number>();
  for (const l of lineups) {
    counts.set(l.mapSlug, (counts.get(l.mapSlug) ?? 0) + 1);
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
        inRotation
      />

      {outRotation.length > 0 && (
        <Section
          title="Out of Rotation"
          maps={outRotation}
          counts={counts}
          inRotation={false}
        />
      )}
    </div>
  );
}

function Section({
  title,
  maps,
  counts,
  inRotation,
}: {
  title: string;
  maps: MapInfo[];
  counts: Map<string, number>;
  inRotation: boolean;
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
            inRotation={inRotation}
          />
        ))}
      </div>
    </section>
  );
}

function MapCard({
  map,
  count,
  inRotation,
}: {
  map: MapInfo;
  count: number;
  inRotation: boolean;
}) {
  return (
    <Link
      href={`/maps/${map.slug}`}
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
          inRotation ? "" : "grayscale-[35%] opacity-80"
        }`}
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
        <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white/90">
          {count} {count === 1 ? "lineup" : "lineups"}
        </span>
      </div>
    </Link>
  );
}
