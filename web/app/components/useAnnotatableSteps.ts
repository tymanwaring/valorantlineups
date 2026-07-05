"use client";

import { useState } from "react";
import type { LineupStep, StepAnnotation } from "@/lib/types";

/** Persist a single step's annotations to the server (annotator "Save"). */
export async function saveStepAnnotations(
  lineupId: string,
  image: string,
  stepIndex: number,
  annotations: StepAnnotation[],
): Promise<boolean> {
  try {
    const res = await fetch(`/api/lineups/${lineupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "annotations",
        image,
        stepIndex,
        annotations,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Local step state for a preview lightbox that can be annotated in place.
 * Tracks the active carousel index and applies annotation edits optimistically,
 * persisting them instantly when a lineupId is available.
 */
export function useAnnotatableSteps(
  initial: LineupStep[],
  opts: { lineupId?: string; onSaved?: () => void } = {},
) {
  const [steps, setSteps] = useState<LineupStep[]>(initial);
  const [current, setCurrent] = useState(0);
  const [annotating, setAnnotating] = useState(false);
  const [saving, setSaving] = useState(false);

  const idx = Math.min(current, Math.max(0, steps.length - 1));
  const step = steps[idx];
  // Only server-hosted images (existing lineup) can be edited in place.
  const canAnnotate = !!opts.lineupId && !!step?.image;

  async function apply(annotations: StepAnnotation[]) {
    const anns = annotations.length ? annotations : undefined;
    const target = steps[idx];
    setSteps((ss) =>
      ss.map((s, i) => (i === idx ? { ...s, annotations: anns } : s)),
    );
    setAnnotating(false);
    if (opts.lineupId && target?.image) {
      setSaving(true);
      const ok = await saveStepAnnotations(
        opts.lineupId,
        target.image,
        idx,
        annotations,
      );
      setSaving(false);
      if (ok) opts.onSaved?.();
    }
  }

  return {
    steps,
    current,
    setCurrent,
    step,
    canAnnotate,
    annotating,
    setAnnotating,
    saving,
    apply,
  };
}
