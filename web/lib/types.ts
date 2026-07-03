export type LineupStep = {
  caption: string;
  image?: string;
};

export type Lineup = {
  id: string;
  mapSlug: string;
  agentSlug: string;
  title: string;
  ability: string;
  side: "Attack" | "Defense";
  /** Which bomb site the lineup is for: "A", "B", "C", or "Mid". */
  site?: string;
  /** Plant spot the lineup is thrown from/at (attack only), e.g. "Default", "Behind Box". */
  plantSpot?: string;
  steps: LineupStep[];
  notes?: string;
  /** Sova Recon/Shock Bolt charge level (1-3 bars). */
  charge?: number;
  /** Sova Recon/Shock Bolt bounce count (0-2). */
  bounces?: number;
  createdAt: string;

  /** @deprecated use steps[]; kept so legacy records still typecheck */
  standImage?: string;
  /** @deprecated use steps[] */
  aimImage?: string;
  /** @deprecated use steps[] */
  landImage?: string;
};

export type NewLineup = Omit<Lineup, "id" | "createdAt">;

export const DEFAULT_STEP_CAPTIONS = ["Stand here", "Aim here", "Result"];

type Legacyish = {
  steps?: unknown;
  standImage?: string | null;
  aimImage?: string | null;
  landImage?: string | null;
};

/**
 * Return a normalized ordered steps[] for a record. If it already has steps,
 * use them; otherwise synthesize from the legacy stand/aim/land image fields.
 */
export function normalizeSteps(row: Legacyish): LineupStep[] {
  if (Array.isArray(row.steps)) {
    return (row.steps as unknown[])
      .map((s) => {
        const step = s as { caption?: unknown; image?: unknown };
        return {
          caption: typeof step.caption === "string" ? step.caption : "",
          image: typeof step.image === "string" && step.image ? step.image : undefined,
        };
      })
      .filter((s) => s.caption.trim() !== "" || s.image);
  }

  const legacy = [row.standImage, row.aimImage, row.landImage];
  const steps: LineupStep[] = [];
  legacy.forEach((img, i) => {
    if (img) steps.push({ caption: DEFAULT_STEP_CAPTIONS[i] ?? `Step ${i + 1}`, image: img });
  });
  return steps;
}
