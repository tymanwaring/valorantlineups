import data from "./callouts.json";

export type Callout = { n: string; s: string; x: number; y: number };

const callouts = data as Record<string, Callout[]>;

/** Callout labels (normalized 0-1 minimap positions) for a map slug. */
export function getCallouts(slug: string): Callout[] {
  return callouts[slug.toLowerCase()] ?? [];
}

export type Rotation = 0 | 90 | 180 | 270;

/**
 * Rotation (clockwise degrees) that puts the attacker spawn at the bottom of
 * the minimap. Derived from the attacker-spawn callout position.
 */
export function attackerBottomRotation(slug: string): Rotation {
  const spawn = getCallouts(slug).find(
    (c) => c.n === "Spawn" && /attack/i.test(c.s),
  );
  if (!spawn) return 0;
  // After each rotation, the attacker spawn's new Y; pick the one nearest bottom.
  const cands: { deg: Rotation; y: number }[] = [
    { deg: 0, y: spawn.y },
    { deg: 90, y: spawn.x },
    { deg: 180, y: 1 - spawn.y },
    { deg: 270, y: 1 - spawn.x },
  ];
  cands.sort((a, b) => b.y - a.y);
  return cands[0].deg;
}

/** Map a point from original minimap space into the rotated display space. */
export function rotatePoint(x: number, y: number, deg: Rotation) {
  switch (deg) {
    case 90:
      return { x: 1 - y, y: x };
    case 180:
      return { x: 1 - x, y: 1 - y };
    case 270:
      return { x: y, y: 1 - x };
    default:
      return { x, y };
  }
}

/** Inverse of rotatePoint: display space -> original minimap space. */
export function rotateInverse(x: number, y: number, deg: Rotation) {
  switch (deg) {
    case 90:
      return { x: y, y: 1 - x };
    case 180:
      return { x: 1 - x, y: 1 - y };
    case 270:
      return { x: 1 - y, y: x };
    default:
      return { x, y };
  }
}
