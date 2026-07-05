import { notFound, redirect } from "next/navigation";
import { getMap } from "@/lib/maps";
import { getCallouts } from "@/lib/callouts";
import { canManage } from "@/lib/session";
import CalloutEditor from "./CalloutEditor";

export const dynamic = "force-dynamic";

export default async function EditLabelsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const map = getMap(slug);
  if (!map) notFound();
  if (!(await canManage())) redirect(`/maps/${map.slug}`);

  return (
    <CalloutEditor
      mapSlug={map.slug}
      mapName={map.name}
      minimap={map.minimap}
      initialCallouts={getCallouts(map.slug)}
    />
  );
}
