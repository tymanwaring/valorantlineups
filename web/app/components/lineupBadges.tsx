import type { ReactNode } from "react";
import type { Lineup } from "@/lib/types";
import { SovaIndicator } from "@/app/components/SovaIndicator";

// Which dart an "aim" step belongs to, based on its caption. null if the step
// isn't an aim step (or the dart can't be determined).
export function dartOfCaption(caption: string): 1 | 2 | null {
  const c = caption.toLowerCase();
  if (!c.includes("aim")) return null;
  if (c.includes("second") || c.includes("2nd")) return 2;
  if (c.includes("first") || c.includes("1st")) return 1;
  return null;
}

// Build per-step dart indicators for double-shock lineups (card + lightbox).
export function buildCardDartOverlays(
  lineup: Lineup,
  variant: "badge" | "full" = "badge",
): {
  stepOverlays?: (ReactNode | null)[];
  placedBothDarts: boolean;
  isSova: boolean;
  isDouble: boolean;
} {
  const steps = lineup.steps ?? [];
  const isSova = lineup.agentSlug === "sova";
  const isDouble = isSova && !!lineup.doubleShock;
  if (!isDouble || steps.length === 0) {
    return { placedBothDarts: false, isSova, isDouble };
  }
  let p1 = false;
  let p2 = false;
  const stepOverlays = steps.map((s, i) => {
    const dart = dartOfCaption(s.caption);
    if (dart === 2) {
      p2 = true;
      return (
        <SovaIndicator
          key={i}
          title={variant === "full" ? "Second Dart" : undefined}
          charge={lineup.charge2}
          bounces={lineup.bounces2}
          jump={lineup.jump2}
          variant={variant}
        />
      );
    }
    if (dart === 1) {
      p1 = true;
      return (
        <SovaIndicator
          key={i}
          title={variant === "full" ? "First Dart" : undefined}
          charge={lineup.charge}
          bounces={lineup.bounces}
          jump={lineup.jump}
          variant={variant}
        />
      );
    }
    return null;
  });
  const placedBothDarts = p1 && p2;
  return {
    stepOverlays: placedBothDarts ? stepOverlays : undefined,
    placedBothDarts,
    isSova,
    isDouble,
  };
}

// Tag badges + non-per-step dart indicators, overlaid on a step image.
export function LineupOverlayBadges({
  lineup,
  isSova,
  isDouble,
  placedBothDarts,
  reserveKebab,
  big = false,
}: {
  lineup: Lineup;
  isSova: boolean;
  isDouble: boolean;
  placedBothDarts: boolean;
  reserveKebab: boolean;
  big?: boolean;
}) {
  const dartVariant = big ? "full" : "badge";
  return (
    <div
      className={`pointer-events-none absolute left-2 top-2 z-[5] flex flex-col items-start gap-1 ${
        reserveKebab ? "right-[4.75rem]" : "right-2"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded bg-black/70 px-2 py-0.5 text-xs">
          {lineup.side}
        </span>
        {lineup.site && (
          <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
            {lineup.site === "Mid" ? "Mid" : `${lineup.site} Site`}
          </span>
        )}
        {lineup.plantSpot && (
          <span className="rounded bg-black/70 px-2 py-0.5 text-xs">
            {lineup.plantSpot}
          </span>
        )}
        {lineup.doubleShock && (
          <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
            Double Shock
          </span>
        )}
        {lineup.jump && lineup.agentSlug !== "sova" && (
          <span className="rounded bg-accent/80 px-2 py-0.5 text-xs font-semibold text-white">
            Jump
          </span>
        )}
      </div>
      {isSova && !isDouble && (lineup.charge != null || lineup.jump) && (
        <SovaIndicator
          charge={lineup.charge}
          bounces={lineup.bounces}
          jump={lineup.jump}
          variant={dartVariant}
        />
      )}
      {isSova && isDouble && !placedBothDarts && (
        <div className="flex items-start gap-1">
          <SovaIndicator
            title={big ? "First Dart" : undefined}
            charge={lineup.charge}
            bounces={lineup.bounces}
            jump={lineup.jump}
            variant={dartVariant}
          />
          <SovaIndicator
            title={big ? "Second Dart" : undefined}
            charge={lineup.charge2}
            bounces={lineup.bounces2}
            jump={lineup.jump2}
            variant={dartVariant}
          />
        </div>
      )}
    </div>
  );
}
