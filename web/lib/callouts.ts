import data from "./callouts.json";

export type Callout = { n: string; s: string; x: number; y: number };

const callouts = data as Record<string, Callout[]>;

/** Callout labels (normalized 0-1 minimap positions) for a map slug. */
export function getCallouts(slug: string): Callout[] {
  return callouts[slug.toLowerCase()] ?? [];
}

export type Rotation = 0 | 90 | 180 | 270;

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

/**
 * Rotation (clockwise degrees) that puts the attacker spawn at the bottom of
 * the minimap. Prefers the rotation where the attacker spawn sits furthest
 * BELOW the defender spawn — this captures the map's true axis and stays
 * correct even when a spawn is tucked in a corner (a plain "max attacker Y"
 * metric can pick a sideways rotation there). Falls back to attacker Y alone
 * when a defender spawn callout isn't available.
 */
export function attackerBottomRotation(
  slug: string,
  calloutsOverride?: Callout[],
): Rotation {
  const callouts = calloutsOverride ?? getCallouts(slug);
  const attacker = callouts.find((c) => c.n === "Spawn" && /attack/i.test(c.s));
  if (!attacker) return 0;
  const defender = callouts.find((c) => c.n === "Spawn" && /defend/i.test(c.s));

  const score = (deg: Rotation): number => {
    const a = rotatePoint(attacker.x, attacker.y, deg);
    if (!defender) return a.y;
    const d = rotatePoint(defender.x, defender.y, deg);
    return a.y - d.y;
  };

  return [...ROTATIONS].sort((x, y) => score(y) - score(x))[0];
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
