import { notFound } from "next/navigation";
import { getMap, MAPS } from "@/lib/maps";
import { getLineupsForMap } from "@/lib/store";
import { getMapCallouts } from "@/lib/callouts-store";
import { canManage } from "@/lib/session";
import MapClient from "./MapClient";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return MAPS.map((m) => ({ slug: m.slug }));
}

export default async function MapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const map = getMap(slug);
  if (!map) notFound();

  const [lineups, callouts, canEdit] = await Promise.all([
    getLineupsForMap(map.slug),
    getMapCallouts(map.slug),
    canManage(),
  ]);

  return (
    <MapClient
      mapSlug={map.slug}
      mapName={map.name}
      mapImage={map.image}
      lineups={lineups}
      callouts={callouts}
      canEdit={canEdit}
    />
  );
}
