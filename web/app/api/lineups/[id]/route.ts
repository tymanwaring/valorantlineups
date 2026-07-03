import { NextRequest, NextResponse } from "next/server";
import { getLineup, updateLineup, deleteLineup } from "@/lib/store";
import { getMap } from "@/lib/maps";
import { getAgent } from "@/lib/agents";
import { deleteUpload, UploadError } from "@/lib/uploads";
import { parseStepsFromForm, collectStepImages } from "@/lib/steps-form";
import type { Lineup } from "@/lib/types";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await getLineup(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await req.formData();
  const patch: Partial<Omit<Lineup, "id" | "createdAt">> = {};

  const mapSlug = String(form.get("mapSlug") || "").toLowerCase();
  const agentSlug = String(form.get("agentSlug") || "").toLowerCase();
  const title = String(form.get("title") || "").trim();
  const ability = String(form.get("ability") || "").trim();
  const side = String(form.get("side") || "");
  const notes = String(form.get("notes") || "").trim();

  if (mapSlug) {
    if (!getMap(mapSlug)) {
      return NextResponse.json({ error: "Invalid map" }, { status: 400 });
    }
    patch.mapSlug = mapSlug;
  }
  if (agentSlug) {
    if (!getAgent(agentSlug)) {
      return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
    }
    patch.agentSlug = agentSlug;
  }
  if (form.has("title")) {
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    patch.title = title;
  }
  if (form.has("ability")) patch.ability = ability;
  if (side === "Attack" || side === "Defense") patch.side = side;
  if (form.has("notes")) patch.notes = notes || undefined;

  if (form.has("site")) {
    patch.site = String(form.get("site") || "").trim() || undefined;
  }
  // Plant spot only applies to attack lineups; clear it on defense.
  const effectiveSide = patch.side ?? existing.side;
  if (effectiveSide === "Defense") {
    patch.plantSpot = undefined;
  } else if (form.has("plantSpot")) {
    patch.plantSpot = String(form.get("plantSpot") || "").trim() || undefined;
  }

  // Sova charge/bounces: only meaningful for Sova, cleared otherwise.
  const effectiveAgent = patch.agentSlug ?? existing.agentSlug;
  const effectiveAbility = patch.ability ?? existing.ability;
  if (effectiveAgent === "sova") {
    patch.charge = parseIntField(form.get("charge"), 0, 3);
    patch.bounces = parseIntField(form.get("bounces"), 0, 2);
  } else {
    patch.charge = undefined;
    patch.bounces = undefined;
  }
  // Jump applies to any agent (Sova via dart panel, others via checkbox).
  patch.jump = parseBool(form.get("jump")) || undefined;

  // Double Shock only applies to Sova Shock Dart lineups.
  const doubleShock =
    effectiveAgent === "sova" &&
    effectiveAbility === "Shock Dart" &&
    parseBool(form.get("doubleShock"));
  patch.doubleShock = doubleShock || undefined;
  // Second dart values only apply to double-shock lineups.
  patch.charge2 = doubleShock ? parseIntField(form.get("charge2"), 0, 3) : undefined;
  patch.bounces2 = doubleShock ? parseIntField(form.get("bounces2"), 0, 2) : undefined;
  patch.jump2 = doubleShock ? parseBool(form.get("jump2")) || undefined : undefined;

  // Rebuild steps when the form includes them; clean up images no longer used.
  if (form.has("step-0-caption") || form.has("steps-present")) {
    let newSteps;
    try {
      newSteps = await parseStepsFromForm(form);
    } catch (e) {
      if (e instanceof UploadError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
    patch.steps = newSteps;

    const oldImages = new Set([
      ...collectStepImages(existing.steps ?? []),
      existing.standImage,
      existing.aimImage,
      existing.landImage,
    ].filter((s): s is string => !!s));
    const newImages = new Set(collectStepImages(newSteps));
    const toDelete = [...oldImages].filter((img) => !newImages.has(img));
    await Promise.all(toDelete.map((img) => deleteUpload(img)));
  }

  const updated = await updateLineup(id, patch);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const removed = await deleteLineup(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const images = [
    ...collectStepImages(removed.steps ?? []),
    removed.standImage,
    removed.aimImage,
    removed.landImage,
  ].filter((s): s is string => !!s);
  await Promise.all(images.map((img) => deleteUpload(img)));
  return NextResponse.json({ ok: true });
}
