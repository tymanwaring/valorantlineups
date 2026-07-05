import type { StepAnnotation } from "./types";
import { DEFAULT_CIRCLE_THICKNESS } from "./types";

/** Pixel stroke width for an annotation given the content-box width. */
export function strokePx(a: StepAnnotation, boxW: number): number {
  return Math.max(1, (a.t ?? DEFAULT_CIRCLE_THICKNESS) * boxW);
}

/**
 * Arrowhead polygon points (in pixels) for a line ending at (x2,y2).
 * `size` is the head length in pixels.
 */
export function arrowHeadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const ax = x2 + size * Math.cos(ang + Math.PI - spread);
  const ay = y2 + size * Math.sin(ang + Math.PI - spread);
  const bx = x2 + size * Math.cos(ang + Math.PI + spread);
  const by = y2 + size * Math.sin(ang + Math.PI + spread);
  return `${x2},${y2} ${ax},${ay} ${bx},${by}`;
}
