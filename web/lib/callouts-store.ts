import { promises as fs } from "fs";
import path from "path";
import defaults from "./callouts.json";
import type { Callout } from "./callouts";
import { pgEnabled, pgGetCalloutsForMap, pgSetCallouts } from "./pg";

// The committed baseline positions, bundled at build time.
const defaultsMap = defaults as Record<string, Callout[]>;
const FILE = path.join(process.cwd(), "lib", "callouts.json");

/**
 * Resolved callout positions for a map: Postgres overrides (edited via the
 * label editor) take priority when configured, otherwise the committed
 * callouts.json baseline. Server-only — reads the database.
 */
export async function getMapCallouts(slug: string): Promise<Callout[]> {
  const s = slug.toLowerCase();
  if (pgEnabled) {
    try {
      const override = await pgGetCalloutsForMap(s);
      if (override && override.length) return override;
    } catch {
      // DB unavailable — fall back to the committed baseline.
    }
  }
  return defaultsMap[s] ?? [];
}

/**
 * Persist edited callout positions for a map. Uses Postgres when configured
 * (works on read-only hosts like Vercel); otherwise writes the committed
 * callouts.json so a local author can commit the change.
 */
export async function saveMapCallouts(
  slug: string,
  callouts: Callout[],
): Promise<void> {
  const s = slug.toLowerCase();
  if (pgEnabled) {
    await pgSetCallouts(s, callouts);
    return;
  }
  const data = JSON.parse(await fs.readFile(FILE, "utf8")) as Record<
    string,
    Callout[]
  >;
  data[s] = callouts;
  await fs.writeFile(FILE, JSON.stringify(data), "utf8");
}
