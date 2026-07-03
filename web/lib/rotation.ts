import { promises as fs } from "fs";
import path from "path";
import { MAPS } from "./maps";
import { pgEnabled, pgGetRotation, pgSetRotation } from "./pg";

const DATA_FILE = path.join(process.cwd(), "data", "rotation.json");

// Default rotation (v12.08 / V26 Act 3) used if the file is missing.
const DEFAULT_ROTATION = [
  "ascent",
  "breeze",
  "fracture",
  "haven",
  "lotus",
  "pearl",
  "split",
];

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
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify({ inRotation: DEFAULT_ROTATION }, null, 2),
      "utf8",
    );
  }
}

export async function getRotation(): Promise<string[]> {
  if (pgEnabled) return pgGetRotation();
  await ensureFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as { inRotation?: string[] };
    return Array.isArray(parsed.inRotation)
      ? parsed.inRotation.map((s) => s.toLowerCase())
      : [];
  } catch {
    return [];
  }
}

export async function setRotation(slugs: string[]): Promise<string[]> {
  if (pgEnabled) return pgSetRotation(slugs);
  // Keep only valid map slugs, de-duplicated.
  const valid = new Set(MAPS.map((m) => m.slug));
  const cleaned = Array.from(
    new Set(slugs.map((s) => s.toLowerCase()).filter((s) => valid.has(s))),
  );
  return withLock(async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify({ inRotation: cleaned }, null, 2),
      "utf8",
    );
    return cleaned;
  });
}
