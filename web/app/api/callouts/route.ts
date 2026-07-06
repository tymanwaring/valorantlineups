import { NextRequest, NextResponse } from "next/server";
import { canManage } from "@/lib/session";
import { getMap } from "@/lib/maps";
import { saveMapCallouts } from "@/lib/callouts-store";
import type { Callout } from "@/lib/callouts";

export const dynamic = "force-dynamic";

type CalloutInput = { n: string; s: string; x: number; y: number };

const clamp = (n: number): number =>
  Math.min(1, Math.max(0, Math.round(n * 1e4) / 1e4));

// Persist edited callout positions for a single map. Uses Postgres when
// configured (so it works on read-only hosts like Vercel), else writes the
// committed callouts.json for local authoring.
export async function POST(req: NextRequest) {
  if (!(await canManage())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    callouts?: CalloutInput[];
  } | null;

  const slug = String(body?.slug ?? "").toLowerCase();
  if (!getMap(slug)) {
    return NextResponse.json({ error: "Invalid map" }, { status: 400 });
  }
  if (!Array.isArray(body?.callouts)) {
    return NextResponse.json({ error: "Invalid callouts" }, { status: 400 });
  }

  const cleaned: Callout[] = body.callouts
    .map((c) => ({
      n: String(c.n ?? ""),
      s: String(c.s ?? ""),
      x: clamp(Number(c.x)),
      y: clamp(Number(c.y)),
    }))
    .filter((c) => c.n && Number.isFinite(c.x) && Number.isFinite(c.y));

  try {
    await saveMapCallouts(slug, cleaned);
  } catch {
    return NextResponse.json(
      { error: "Could not save callouts. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count: cleaned.length });
}
