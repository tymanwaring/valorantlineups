// Sova Recon/Shock Dart HUD-style indicator: a 3-segment charge bar with the
// bounce diamonds (0-2) underneath. Purely presentational.

const CHARGE_MAX = 3;
const BOUNCE_MAX = 2;
const FILLED = "#38e0c8"; // Sova-ish teal

export function SovaIndicator({
  charge,
  bounces,
  jump,
  ability,
  title,
  variant = "badge",
}: {
  charge?: number;
  bounces?: number;
  jump?: boolean;
  ability?: string;
  /** Overrides the ability heading in the full panel (e.g. "First Dart"). */
  title?: string;
  variant?: "badge" | "full" | "wide";
}) {
  const c = clamp(charge, 0, CHARGE_MAX);
  const b = clamp(bounces, 0, BOUNCE_MAX);
  const heading = title ?? ability;
  // Nothing worth showing (the heading alone is enough for the panel).
  if (
    c === 0 &&
    (bounces == null || Number.isNaN(bounces)) &&
    !jump &&
    !heading
  )
    return null;

  if (variant === "wide") {
    return (
      <span className="flex w-full flex-col items-center gap-2">
        <WideChargeBar filled={c} />
        <span className="flex items-center gap-2">
          <Diamonds filled={b} big />
          {jump && <JumpTag />}
        </span>
      </span>
    );
  }

  if (variant === "full") {
    return (
      <div className="inline-flex flex-col items-center gap-2 rounded-lg border border-panel-border bg-black/40 px-5 py-3">
        {heading && (
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: FILLED }}
          >
            {heading}
          </span>
        )}
        <span className="text-[10px] font-semibold tracking-widest text-foreground/50">
          CHARGE
        </span>
        <ChargeBar filled={c} big />
        <Diamonds filled={b} big />
        <span className="text-[10px] font-semibold tracking-widest text-foreground/50">
          {b} BOUNCE{b === 1 ? "" : "S"}
        </span>
        {jump && <JumpTag />}
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col items-center gap-1 rounded bg-black/70 px-2 py-1">
      <ChargeBar filled={c} />
      <span className="flex items-center gap-1">
        <Diamonds filled={b} />
        {jump && <JumpTag small />}
      </span>
    </span>
  );
}

function JumpTag({ small }: { small?: boolean }) {
  return (
    <span
      className={`rounded font-bold uppercase tracking-widest text-black ${
        small ? "px-1 text-[8px]" : "px-1.5 py-0.5 text-[9px]"
      }`}
      style={{ background: FILLED }}
    >
      Jump
    </span>
  );
}

function WideChargeBar({ filled }: { filled: number }) {
  return (
    <span className="flex w-full" style={{ gap: 4 }}>
      {[1, 2, 3].map((level) => {
        const on = filled >= level;
        return (
          <span
            key={level}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 2,
              background: on ? FILLED : "rgba(255,255,255,0.14)",
              boxShadow: on ? `0 0 8px ${FILLED}88` : "none",
            }}
          />
        );
      })}
    </span>
  );
}

function ChargeBar({ filled, big }: { filled: number; big?: boolean }) {
  const segW = big ? 22 : 13;
  const segH = big ? 6 : 4;
  return (
    <span className="flex" style={{ gap: big ? 3 : 2 }}>
      {[1, 2, 3].map((level) => {
        const on = filled >= level;
        return (
          <span
            key={level}
            style={{
              width: segW,
              height: segH,
              borderRadius: 1,
              background: on ? FILLED : "rgba(255,255,255,0.14)",
              boxShadow: on ? `0 0 6px ${FILLED}88` : "none",
            }}
          />
        );
      })}
    </span>
  );
}

function Diamonds({ filled, big }: { filled: number; big?: boolean }) {
  const size = big ? 12 : 6;
  return (
    <span className="flex items-center" style={{ gap: big ? 8 : 4 }}>
      {Array.from({ length: BOUNCE_MAX }).map((_, i) => {
        const on = i < filled;
        return (
          <span
            key={i}
            style={{
              width: size,
              height: size,
              transform: "rotate(45deg)",
              background: on ? FILLED : "transparent",
              border: `1px solid ${on ? FILLED : "rgba(255,255,255,0.35)"}`,
              boxShadow: on ? `0 0 5px ${FILLED}88` : "none",
            }}
          />
        );
      })}
    </span>
  );
}

function clamp(n: number | undefined, min: number, max: number): number {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.min(max, Math.max(min, Math.round(n)));
}
