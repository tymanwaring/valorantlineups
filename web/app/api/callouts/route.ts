import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { canManage } from "@/lib/session";
import { getMap } from "@/lib/maps";

export const dynamic = "force-dynamic";

type CalloutInput = { n: string; s: string; x: number; y: number };

// The committed source of truth for callout label positions.
const FILE = path.join(process.cwd(), "lib", "callouts.json");

const clamp = (n: number): number =>
  Math.min(1, Math.max(0, Math.round(n * 1e4) / 1e4));

// Persist edited callout positions for a single map back into callouts.json.
// This is a local authoring tool: it writes the committed data file so the fix
// is permanent once committed. On a read-only filesystem (e.g. Vercel) it
// returns a clear error instead of silently failing.
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

  const cleaned: CalloutInput[] = body.callouts
    .map((c) => ({
      n: String(c.n ?? ""),
      s: String(c.s ?? ""),
      x: clamp(Number(c.x)),
      y: clamp(Number(c.y)),
    }))
    .filter((c) => c.n && Number.isFinite(c.x) && Number.isFinite(c.y));

  let data: Record<string, CalloutInput[]>;
  try {
    data = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return NextResponse.json(
      { error: "Could not read callouts file" },
      { status: 500 },
    );
  }

  data[slug] = cleaned;

  try {
    await fs.writeFile(FILE, JSON.stringify(data), "utf8");
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not write callouts — the filesystem is read-only here. Edit locally in dev, then commit callouts.json.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count: cleaned.length });
}
