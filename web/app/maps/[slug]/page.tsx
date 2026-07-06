import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMap, MAPS } from "@/lib/maps";
import { getAgent } from "@/lib/agents";
import { getLineupsForMap, getLineup } from "@/lib/store";
import { getMapCallouts } from "@/lib/callouts-store";
import { canManage } from "@/lib/session";
import MapClient from "./MapClient";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return MAPS.map((m) => ({ slug: m.slug }));
}

function siteLabel(site?: string): string {
  if (!site) return "";
  return site === "Mid" ? "Mid" : `${site} Site`;
}

// Rich metadata so shared deep links (?lineup=…) unfurl with a preview image.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const map = getMap(slug);
  const mapName = map?.name ?? slug;

  const lineupId = typeof sp.lineup === "string" ? sp.lineup : undefined;
  const lineup = lineupId ? await getLineup(lineupId) : undefined;

  if (lineup) {
    const agent = getAgent(lineup.agentSlug);
    const title = `${lineup.title} — ${agent?.name ?? lineup.agentSlug} • ${mapName}`;
    const description = [
      agent?.name,
      lineup.ability,
      lineup.side,
      siteLabel(lineup.site),
    ]
      .filter(Boolean)
      .join(" • ");
    const image = `/api/og?lineup=${lineup.id}`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  }

  return { title: `${mapName} lineups • brimmybuddy` };
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
