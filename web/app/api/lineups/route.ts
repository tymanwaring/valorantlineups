import { NextRequest, NextResponse } from "next/server";
import { getLineups, addLineup } from "@/lib/store";
import type { NewLineup } from "@/lib/types";
import { PRECISION_LEVELS } from "@/lib/types";
import { getMap } from "@/lib/maps";
import { getAgent } from "@/lib/agents";
import { parseStepsFromForm } from "@/lib/steps-form";
import { UploadError } from "@/lib/uploads";

export async function GET() {
  const lineups = await getLineups();
  return NextResponse.json(lineups);
}

function parseIntField(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseBool(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

// Normalized (0-1) minimap coordinate. Returns undefined when absent/invalid.
function parseCoord(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(1, Math.max(0, n));
}

// Seconds for a projectile to land. Clamped to a sane 0-60s, one decimal.
function parseSeconds(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(Math.min(60, n) * 10) / 10;
}

function parsePrecision(value: FormDataEntryValue | null): string | undefined {
  const v = String(value ?? "").trim();
  return PRECISION_LEVELS.includes(v as (typeof PRECISION_LEVELS)[number])
    ? v
    : undefined;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const mapSlug = String(form.get("mapSlug") || "").toLowerCase();
  const agentSlug = String(form.get("agentSlug") || "").toLowerCase();
  const title = String(form.get("title") || "").trim();
  const ability = String(form.get("ability") || "").trim();
  const sideRaw = String(form.get("side") || "Attack");
  const side = sideRaw === "Defense" ? "Defense" : "Attack";
  const site = String(form.get("site") || "").trim();
  const plantSpot = String(form.get("plantSpot") || "").trim();
  const notes = String(form.get("notes") || "").trim();

  if (!getMap(mapSlug)) {
    return NextResponse.json({ error: "Invalid map" }, { status: 400 });
  }
  if (!getAgent(agentSlug)) {
    return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  let steps;
  try {
    steps = await parseStepsFromForm(form);
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
  const charge = parseIntField(form.get("charge"), 0, 3);
  const bounces = parseIntField(form.get("bounces"), 0, 2);
  const jump = parseBool(form.get("jump"));
  const crouch = parseBool(form.get("crouch"));
  const timeToLand = parseSeconds(form.get("timeToLand"));
  const precision = parsePrecision(form.get("precision"));
  const isShockDart = agentSlug === "sova" && ability === "Shock Dart";
  const doubleShock = isShockDart && parseBool(form.get("doubleShock"));

  const data: NewLineup = {
    mapSlug,
    agentSlug,
    title,
    ability,
    side,
    site: site || undefined,
    // Plant spot only applies to attack lineups.
    plantSpot: side === "Attack" && plantSpot ? plantSpot : undefined,
    steps,
    charge: agentSlug === "sova" ? charge : undefined,
    bounces: agentSlug === "sova" ? bounces : undefined,
    jump: jump || undefined,
    crouch: crouch || undefined,
    timeToLand,
    precision,
    doubleShock: doubleShock || undefined,
    // Second dart values only apply to double-shock lineups.
    charge2: doubleShock ? parseIntField(form.get("charge2"), 0, 3) : undefined,
    bounces2: doubleShock ? parseIntField(form.get("bounces2"), 0, 2) : undefined,
    jump2: doubleShock ? parseBool(form.get("jump2")) || undefined : undefined,
    fromX: parseCoord(form.get("fromX")),
    fromY: parseCoord(form.get("fromY")),
    toX: parseCoord(form.get("toX")),
    toY: parseCoord(form.get("toY")),
    notes: notes || undefined,
  };

  const lineup = await addLineup(data);
  return NextResponse.json(lineup, { status: 201 });
}
