import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import type { Lineup, NewLineup } from "./types";
import { normalizeSteps } from "./types";
import { MAPS } from "./maps";

const CONNECTION =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

export const pgEnabled = CONNECTION.length > 0;

// Lazily created query function (only when a connection string exists).
const sql = pgEnabled ? neon(CONNECTION) : null;

function db() {
  if (!sql) throw new Error("Postgres is not configured (no DATABASE_URL).");
  return sql;
}

const DEFAULT_ROTATION = [
  "ascent",
  "breeze",
  "fracture",
  "haven",
  "lotus",
  "pearl",
  "split",
];

const SEED_LINEUPS: Lineup[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    mapSlug: "ascent",
    agentSlug: "sova",
    title: "A Site Recon Dart from Spawn",
    ability: "Recon Bolt",
    side: "Attack",
    steps: [],
    notes:
      "Stand at attacker spawn, aim at the top corner of the building. One bounce, no charge. Reveals most of A site on activation.",
    createdAt: "2026-07-03T00:00:00.000Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    mapSlug: "ascent",
    agentSlug: "viper",
    title: "Mid Wall from Attacker Side",
    ability: "Toxic Screen",
    side: "Attack",
    steps: [],
    notes:
      "Place the wall from A Main across mid to cut off catwalk vision when hitting A.",
    createdAt: "2026-07-03T00:00:01.000Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    mapSlug: "ascent",
    agentSlug: "brimstone",
    title: "A Site Defensive Smoke",
    ability: "Sky Smoke",
    side: "Defense",
    steps: [],
    notes:
      "From A site, smoke A Main choke to delay attacker entry and buy rotation time.",
    createdAt: "2026-07-03T00:00:02.000Z",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    mapSlug: "bind",
    agentSlug: "brimstone",
    title: "A Site Post-Plant Smokes",
    ability: "Sky Smoke",
    side: "Attack",
    steps: [],
    notes:
      "After planting default on A, drop smokes on Heaven and Screens to deny common retake angles.",
    createdAt: "2026-07-03T00:00:03.000Z",
  },
];

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const q = db();
      await q`
        CREATE TABLE IF NOT EXISTS lineups (
          id uuid PRIMARY KEY,
          map_slug text NOT NULL,
          agent_slug text NOT NULL,
          title text NOT NULL,
          ability text,
          side text NOT NULL,
          site text,
          plant_spot text,
          stand_image text,
          aim_image text,
          land_image text,
          steps jsonb NOT NULL DEFAULT '[]'::jsonb,
          charge int,
          bounces int,
          jump boolean NOT NULL DEFAULT false,
          crouch boolean NOT NULL DEFAULT false,
          time_to_land double precision,
          precision_level text,
          double_shock boolean NOT NULL DEFAULT false,
          charge2 int,
          bounces2 int,
          jump2 boolean NOT NULL DEFAULT false,
          from_x double precision,
          from_y double precision,
          to_x double precision,
          to_y double precision,
          notes text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      // Ensure columns exist for databases created before they were added.
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS charge int`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS bounces int`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS site text`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS plant_spot text`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS double_shock boolean NOT NULL DEFAULT false`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS charge2 int`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS bounces2 int`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS jump boolean NOT NULL DEFAULT false`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS jump2 boolean NOT NULL DEFAULT false`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS crouch boolean NOT NULL DEFAULT false`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS time_to_land double precision`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS precision_level text`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS from_x double precision`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS from_y double precision`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS to_x double precision`;
      await q`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS to_y double precision`;
      await q`
        CREATE TABLE IF NOT EXISTS rotation (
          map_slug text PRIMARY KEY
        )
      `;

      // Seed rotation if empty.
      const rot = await q`SELECT count(*)::int AS n FROM rotation`;
      if (rot[0]?.n === 0) {
        for (const slug of DEFAULT_ROTATION) {
          await q`INSERT INTO rotation (map_slug) VALUES (${slug}) ON CONFLICT DO NOTHING`;
        }
      }

      // Seed sample lineups if empty.
      const lc = await q`SELECT count(*)::int AS n FROM lineups`;
      if (lc[0]?.n === 0) {
        for (const l of SEED_LINEUPS) {
          await q`
            INSERT INTO lineups (id, map_slug, agent_slug, title, ability, side, site, plant_spot, steps, notes, created_at)
            VALUES (${l.id}::uuid, ${l.mapSlug}, ${l.agentSlug}, ${l.title}, ${l.ability ?? ""}, ${l.side}, ${l.site ?? null}, ${l.plantSpot ?? null}, ${JSON.stringify(l.steps)}::jsonb, ${l.notes ?? null}, ${l.createdAt})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

type Row = Record<string, unknown>;

function rowToLineup(r: Row): Lineup {
  // Prefer the steps column; fall back to legacy image columns.
  const rawSteps = r.steps;
  const steps = normalizeSteps({
    steps: Array.isArray(rawSteps)
      ? rawSteps
      : typeof rawSteps === "string"
        ? safeJson(rawSteps)
        : undefined,
    standImage: (r.stand_image as string) ?? null,
    aimImage: (r.aim_image as string) ?? null,
    landImage: (r.land_image as string) ?? null,
  });

  return {
    id: String(r.id),
    mapSlug: String(r.map_slug),
    agentSlug: String(r.agent_slug),
    title: String(r.title),
    ability: (r.ability as string) ?? "",
    side: r.side === "Defense" ? "Defense" : "Attack",
    site: (r.site as string) || undefined,
    plantSpot: (r.plant_spot as string) || undefined,
    steps,
    charge: r.charge == null ? undefined : Number(r.charge),
    bounces: r.bounces == null ? undefined : Number(r.bounces),
    jump: r.jump === true ? true : undefined,
    crouch: r.crouch === true ? true : undefined,
    timeToLand: r.time_to_land == null ? undefined : Number(r.time_to_land),
    precision: (r.precision_level as string) || undefined,
    doubleShock: r.double_shock === true ? true : undefined,
    charge2: r.charge2 == null ? undefined : Number(r.charge2),
    bounces2: r.bounces2 == null ? undefined : Number(r.bounces2),
    jump2: r.jump2 === true ? true : undefined,
    fromX: r.from_x == null ? undefined : Number(r.from_x),
    fromY: r.from_y == null ? undefined : Number(r.from_y),
    toX: r.to_x == null ? undefined : Number(r.to_x),
    toY: r.to_y == null ? undefined : Number(r.to_y),
    notes: (r.notes as string) ?? undefined,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export async function pgGetLineups(): Promise<Lineup[]> {
  await ensureSchema();
  const rows = await db()`SELECT * FROM lineups ORDER BY created_at ASC`;
  return (rows as Row[]).map(rowToLineup);
}

export async function pgGetLineupsForMap(mapSlug: string): Promise<Lineup[]> {
  await ensureSchema();
  const rows =
    await db()`SELECT * FROM lineups WHERE map_slug = ${mapSlug.toLowerCase()} ORDER BY created_at ASC`;
  return (rows as Row[]).map(rowToLineup);
}

export async function pgGetLineup(id: string): Promise<Lineup | undefined> {
  await ensureSchema();
  const rows = await db()`SELECT * FROM lineups WHERE id = ${id}::uuid`;
  const row = (rows as Row[])[0];
  return row ? rowToLineup(row) : undefined;
}

export async function pgAddLineup(data: NewLineup): Promise<Lineup> {
  await ensureSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await db()`
    INSERT INTO lineups (id, map_slug, agent_slug, title, ability, side, site, plant_spot, steps, charge, bounces, jump, crouch, time_to_land, precision_level, double_shock, charge2, bounces2, jump2, from_x, from_y, to_x, to_y, notes, created_at)
    VALUES (
      ${id}::uuid, ${data.mapSlug}, ${data.agentSlug}, ${data.title}, ${data.ability ?? ""},
      ${data.side}, ${data.site ?? null}, ${data.plantSpot ?? null}, ${JSON.stringify(data.steps ?? [])}::jsonb, ${data.charge ?? null}, ${data.bounces ?? null},
      ${data.jump ?? false}, ${data.crouch ?? false}, ${data.timeToLand ?? null}, ${data.precision ?? null}, ${data.doubleShock ?? false}, ${data.charge2 ?? null}, ${data.bounces2 ?? null}, ${data.jump2 ?? false},
      ${data.fromX ?? null}, ${data.fromY ?? null}, ${data.toX ?? null}, ${data.toY ?? null}, ${data.notes ?? null}, ${createdAt}
    )
  `;
  return { ...data, id, createdAt };
}

export async function pgUpdateLineup(
  id: string,
  patch: Partial<Omit<Lineup, "id" | "createdAt">>,
): Promise<Lineup | undefined> {
  const existing = await pgGetLineup(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch };
  await db()`
    UPDATE lineups SET
      map_slug = ${merged.mapSlug},
      agent_slug = ${merged.agentSlug},
      title = ${merged.title},
      ability = ${merged.ability ?? ""},
      side = ${merged.side},
      site = ${merged.site ?? null},
      plant_spot = ${merged.plantSpot ?? null},
      steps = ${JSON.stringify(merged.steps ?? [])}::jsonb,
      charge = ${merged.charge ?? null},
      bounces = ${merged.bounces ?? null},
      jump = ${merged.jump ?? false},
      crouch = ${merged.crouch ?? false},
      time_to_land = ${merged.timeToLand ?? null},
      precision_level = ${merged.precision ?? null},
      double_shock = ${merged.doubleShock ?? false},
      charge2 = ${merged.charge2 ?? null},
      bounces2 = ${merged.bounces2 ?? null},
      jump2 = ${merged.jump2 ?? false},
      from_x = ${merged.fromX ?? null},
      from_y = ${merged.fromY ?? null},
      to_x = ${merged.toX ?? null},
      to_y = ${merged.toY ?? null},
      notes = ${merged.notes ?? null}
    WHERE id = ${id}::uuid
  `;
  return merged;
}

export async function pgDeleteLineup(id: string): Promise<Lineup | undefined> {
  const existing = await pgGetLineup(id);
  if (!existing) return undefined;
  await db()`DELETE FROM lineups WHERE id = ${id}::uuid`;
  return existing;
}

export async function pgGetRotation(): Promise<string[]> {
  await ensureSchema();
  const rows = await db()`SELECT map_slug FROM rotation`;
  return (rows as Row[]).map((r) => String(r.map_slug).toLowerCase());
}

export async function pgSetRotation(slugs: string[]): Promise<string[]> {
  await ensureSchema();
  const valid = new Set(MAPS.map((m) => m.slug));
  const cleaned = Array.from(
    new Set(slugs.map((s) => s.toLowerCase()).filter((s) => valid.has(s))),
  );
  const q = db();
  await q`DELETE FROM rotation`;
  for (const slug of cleaned) {
    await q`INSERT INTO rotation (map_slug) VALUES (${slug}) ON CONFLICT DO NOTHING`;
  }
  return cleaned;
}
