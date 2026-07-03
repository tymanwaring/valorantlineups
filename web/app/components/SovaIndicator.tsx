// Sova Recon/Shock Dart HUD-style indicator: a 3-segment charge bar with the
// bounce diamonds (0-2) underneath. Purely presentational.

const CHARGE_MAX = 3;
const BOUNCE_MAX = 2;
const FILLED = "#38e0c8"; // Sova-ish teal

export function SovaIndicator({
  charge,
  bounces,
  doubleShock,
  ability,
  variant = "badge",
}: {
  charge?: number;
  bounces?: number;
  doubleShock?: boolean;
  ability?: string;
  variant?: "badge" | "full" | "wide";
}) {
  const c = clamp(charge, 0, CHARGE_MAX);
  const b = clamp(bounces, 0, BOUNCE_MAX);
  // Nothing worth showing (the ability label alone is enough for the panel).
  if (
    c === 0 &&
    (bounces == null || Number.isNaN(bounces)) &&
    !doubleShock &&
    !ability
  )
    return null;

  if (variant === "wide") {
    return (
      <span className="flex w-full flex-col items-center gap-2">
        <WideChargeBar filled={c} />
        <Diamonds filled={b} big />
      </span>
    );
  }

  if (variant === "full") {
    return (
      <div className="inline-flex flex-col items-center gap-2 rounded-lg border border-panel-border bg-black/40 px-5 py-3">
        {ability && (
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: FILLED }}
          >
            {ability}
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
        {doubleShock && (
          <>
            <span className="my-0.5 h-px w-10 bg-panel-border" />
            <TwoDarts />
            <span className="text-[10px] font-semibold tracking-widest text-foreground/50">
              DOUBLE SHOCK
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col items-center gap-1 rounded bg-black/70 px-2 py-1">
      <ChargeBar filled={c} />
      <Diamonds filled={b} />
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

function TwoDarts() {
  return (
    <span className="flex items-center" style={{ gap: 6 }}>
      {[0, 1].map((i) => (
        <span
          key={i}
          style={{
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: `12px solid ${FILLED}`,
            filter: `drop-shadow(0 0 5px ${FILLED}88)`,
          }}
        />
      ))}
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
