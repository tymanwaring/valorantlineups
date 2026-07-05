/**
 * Annotations drawn on a step image. All positions are normalized to the
 * image's content box: x is a fraction (0-1) of width, y a fraction of height.
 * Radii/sizes/thickness are fractions of the image WIDTH so shapes scale
 * proportionally and stay round at any display size.
 */
type AnnotationBase = {
  color: string;
  /** Stroke thickness as a fraction of image width. */
  t?: number;
};
export type CircleAnnotation = AnnotationBase & {
  type: "circle";
  x: number;
  y: number;
  r: number;
};
export type ArrowAnnotation = AnnotationBase & {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
/** Crosshair / aim marker at a precise point. r = arm half-length. */
export type DotAnnotation = AnnotationBase & {
  type: "dot";
  x: number;
  y: number;
  r: number;
};
export type TextAnnotation = AnnotationBase & {
  type: "text";
  x: number;
  y: number;
  text: string;
  /** Font size as a fraction of image width. */
  size: number;
};
export type StepAnnotation =
  | CircleAnnotation
  | ArrowAnnotation
  | DotAnnotation
  | TextAnnotation;

/** @deprecated legacy alias; circles are now CircleAnnotation. */
export type StepCircle = CircleAnnotation;

export const ANNOTATION_COLORS = ["#ff4655", "#ffd60a", "#38e0c8", "#ffffff"];

/** Selectable stroke thicknesses (fraction of image width). */
export const CIRCLE_THICKNESSES = [
  { label: "S", value: 0.002 },
  { label: "M", value: 0.004 },
  { label: "L", value: 0.007 },
] as const;

/** Default stroke thickness used when an annotation has none. */
export const DEFAULT_CIRCLE_THICKNESS = 0.004;

/** Default font size for a text annotation (fraction of image width). */
export const DEFAULT_TEXT_SIZE = 0.04;

/** Default arm half-length for a dot/crosshair marker (fraction of width). */
export const DEFAULT_DOT_RADIUS = 0.025;

export type LineupStep = {
  caption: string;
  image?: string;
  /** Optional annotations overlaid on the image. */
  annotations?: StepAnnotation[];
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
  /** Sova Recon/Shock Dart charge level (1-3 bars). First dart when double-shock. */
  charge?: number;
  /** Sova Recon/Shock Dart bounce count (0-2). First dart when double-shock. */
  bounces?: number;
  /** Whether the (first/only) dart requires a jump throw. */
  jump?: boolean;
  /** Whether the lineup requires crouching. */
  crouch?: boolean;
  /** Seconds for the projectile to land/activate after throwing. */
  timeToLand?: number;
  /** How precise the alignment must be: "Low" | "Medium" | "High". */
  precision?: string;
  /** Sova Shock Dart double-shock (two darts) lineup. */
  doubleShock?: boolean;
  /** Second dart charge level (double-shock only). */
  charge2?: number;
  /** Second dart bounce count (double-shock only). */
  bounces2?: number;
  /** Whether the second dart requires a jump throw (double-shock only). */
  jump2?: boolean;
  /** Normalized (0-1) minimap position the lineup is thrown FROM. */
  fromX?: number;
  fromY?: number;
  /** Normalized (0-1) minimap position the lineup LANDS at (optional). */
  toX?: number;
  toY?: number;
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

/** Selectable precision levels for how exact a lineup's alignment must be. */
export const PRECISION_LEVELS = ["Low", "Medium", "High"] as const;

/** Steps for a Sova double-shock lineup, distinguishing the two darts. */
export const DOUBLE_SHOCK_STEP_CAPTIONS = [
  "First dart — Stand",
  "First dart — Aim",
  "Second dart — Stand",
  "Second dart — Aim",
  "Result",
];

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Validate/clamp annotations parsed from storage or form data. */
export function normalizeAnnotations(raw: unknown): StepAnnotation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: StepAnnotation[] = [];
  for (const item of raw) {
    const a = item as Record<string, unknown>;
    const color = ANNOTATION_COLORS.includes(String(a?.color))
      ? String(a.color)
      : ANNOTATION_COLORS[0];
    const rawT = num(a?.t);
    const t = rawT != null ? clamp(rawT, 0.0005, 0.05) : undefined;

    switch (a?.type) {
      case "circle": {
        const x = num(a.x);
        const y = num(a.y);
        const r = num(a.r);
        if (x == null || y == null || r == null) break;
        out.push({
          type: "circle",
          x: clamp01(x),
          y: clamp01(y),
          r: clamp(r, 0.005, 1),
          color,
          t,
        });
        break;
      }
      case "arrow": {
        const x1 = num(a.x1);
        const y1 = num(a.y1);
        const x2 = num(a.x2);
        const y2 = num(a.y2);
        if (x1 == null || y1 == null || x2 == null || y2 == null) break;
        out.push({
          type: "arrow",
          x1: clamp01(x1),
          y1: clamp01(y1),
          x2: clamp01(x2),
          y2: clamp01(y2),
          color,
          t,
        });
        break;
      }
      case "dot": {
        const x = num(a.x);
        const y = num(a.y);
        if (x == null || y == null) break;
        const r = num(a.r);
        out.push({
          type: "dot",
          x: clamp01(x),
          y: clamp01(y),
          r: clamp(r ?? DEFAULT_DOT_RADIUS, 0.005, 0.25),
          color,
          t,
        });
        break;
      }
      case "text": {
        const x = num(a.x);
        const y = num(a.y);
        const text = typeof a.text === "string" ? a.text.trim() : "";
        if (x == null || y == null || !text) break;
        const size = num(a.size);
        out.push({
          type: "text",
          x: clamp01(x),
          y: clamp01(y),
          text: text.slice(0, 140),
          size: clamp(size ?? DEFAULT_TEXT_SIZE, 0.001, 0.25),
          color,
          t,
        });
        break;
      }
      default:
        break;
    }
  }
  return out.length ? out : undefined;
}

/** Migrate legacy `circles` arrays (pre-annotation model) to annotations. */
function circlesToAnnotations(raw: unknown): StepAnnotation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return normalizeAnnotations(
    raw.map((c) => ({ ...(c as Record<string, unknown>), type: "circle" })),
  );
}

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
        const step = s as {
          caption?: unknown;
          image?: unknown;
          annotations?: unknown;
          circles?: unknown;
        };
        return {
          caption: typeof step.caption === "string" ? step.caption : "",
          image: typeof step.image === "string" && step.image ? step.image : undefined,
          annotations:
            normalizeAnnotations(step.annotations) ??
            circlesToAnnotations(step.circles),
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
