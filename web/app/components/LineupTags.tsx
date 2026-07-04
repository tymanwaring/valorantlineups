import type { Lineup } from "@/lib/types";

// Compact chips summarizing a lineup's throw mechanics: jump, crouch, time to
// land and precision. Sova jump is rendered by SovaIndicator, so it's skipped
// here unless `includeJump` is forced on.
export default function LineupTags({
  lineup,
  className = "",
}: {
  lineup: Lineup;
  className?: string;
}) {
  const showJump = lineup.jump && lineup.agentSlug !== "sova";
  const hasAny =
    showJump ||
    lineup.crouch ||
    lineup.timeToLand != null ||
    !!lineup.precision;
  if (!hasAny) return null;

  const precisionTone =
    lineup.precision === "High"
      ? "text-accent"
      : lineup.precision === "Medium"
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showJump && <Chip>Jump</Chip>}
      {lineup.crouch && <Chip>Crouch</Chip>}
      {lineup.timeToLand != null && <Chip>{lineup.timeToLand}s to land</Chip>}
      {lineup.precision && (
        <Chip>
          <span className="text-foreground/50">Precision</span>
          <span className={`font-semibold ${precisionTone}`}>
            {lineup.precision}
          </span>
        </Chip>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-panel-border bg-panel-border/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      {children}
    </span>
  );
}
