import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Lineup, NewLineup } from "./types";
import { normalizeSteps } from "./types";
import {
  pgEnabled,
  pgGetLineups,
  pgGetLineupsForMap,
  pgGetLineup,
  pgGetUsedAgentSlugs,
  pgAddLineup,
  pgUpdateLineup,
  pgDeleteLineup,
} from "./pg";

const DATA_FILE = path.join(process.cwd(), "data", "lineups.json");

// Serialize file writes so concurrent requests can't clobber each other.
let writeChain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => {});
  return run;
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function fileGetLineups(): Promise<Lineup[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const rows = JSON.parse(raw) as Lineup[];
    // Normalize legacy records so every lineup exposes steps[].
    return rows.map((r) => {
      const { standImage, aimImage, landImage, ...rest } = r;
      void standImage;
      void aimImage;
      void landImage;
      return { ...rest, steps: normalizeSteps(r) };
    });
  } catch {
    return [];
  }
}

async function fileAddLineup(data: NewLineup): Promise<Lineup> {
  return withLock(async () => {
    const lineups = await fileGetLineups();
    const lineup: Lineup = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    lineups.push(lineup);
    await fs.writeFile(DATA_FILE, JSON.stringify(lineups, null, 2), "utf8");
    return lineup;
  });
}

async function fileUpdateLineup(
  id: string,
  patch: Partial<Omit<Lineup, "id" | "createdAt">>,
): Promise<Lineup | undefined> {
  return withLock(async () => {
    const lineups = await fileGetLineups();
    const idx = lineups.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    lineups[idx] = { ...lineups[idx], ...patch };
    await fs.writeFile(DATA_FILE, JSON.stringify(lineups, null, 2), "utf8");
    return lineups[idx];
  });
}

async function fileDeleteLineup(id: string): Promise<Lineup | undefined> {
  return withLock(async () => {
    const lineups = await fileGetLineups();
    const idx = lineups.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    const [removed] = lineups.splice(idx, 1);
    await fs.writeFile(DATA_FILE, JSON.stringify(lineups, null, 2), "utf8");
    return removed;
  });
}

// ---- Public API: use Postgres when configured, otherwise the JSON file. ----

export async function getLineups(): Promise<Lineup[]> {
  return pgEnabled ? pgGetLineups() : fileGetLineups();
}

export async function getLineupsForMap(mapSlug: string): Promise<Lineup[]> {
  if (pgEnabled) return pgGetLineupsForMap(mapSlug);
  const lineups = await fileGetLineups();
  return lineups.filter((l) => l.mapSlug === mapSlug.toLowerCase());
}

export async function getUsedAgentSlugs(): Promise<string[]> {
  if (pgEnabled) return pgGetUsedAgentSlugs();
  const lineups = await fileGetLineups();
  return [...new Set(lineups.map((l) => l.agentSlug))];
}

export async function getLineup(id: string): Promise<Lineup | undefined> {
  if (pgEnabled) return pgGetLineup(id);
  const lineups = await fileGetLineups();
  return lineups.find((l) => l.id === id);
}

export async function addLineup(data: NewLineup): Promise<Lineup> {
  return pgEnabled ? pgAddLineup(data) : fileAddLineup(data);
}

export async function updateLineup(
  id: string,
  patch: Partial<Omit<Lineup, "id" | "createdAt">>,
): Promise<Lineup | undefined> {
  return pgEnabled ? pgUpdateLineup(id, patch) : fileUpdateLineup(id, patch);
}

export async function deleteLineup(id: string): Promise<Lineup | undefined> {
  return pgEnabled ? pgDeleteLineup(id) : fileDeleteLineup(id);
}
