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
  // Non-Sova lineups always show a jump chip: "Jump" when required, otherwise a
  // red "No jump". Sova's jump is rendered by SovaIndicator, so skip it here.
  const showJumpTag = lineup.agentSlug !== "sova";
  const hasAny =
    showJumpTag ||
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
      {showJumpTag &&
        (lineup.jump ? <Chip>Jump</Chip> : <Chip tone="danger">No jump</Chip>)}
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

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-accent/50 bg-accent/10 text-accent"
      : "border-panel-border bg-panel-border/40 text-foreground/80";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}
