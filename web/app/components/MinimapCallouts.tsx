import {
  getCallouts,
  attackerBottomRotation,
  rotatePoint,
} from "@/lib/callouts";

// Non-interactive overlay of Valorant callout region names, positioned over a
// top-down minimap (parent must be `relative`).
export default function MinimapCallouts({ slug }: { slug: string }) {
  const callouts = getCallouts(slug);
  const rot = attackerBottomRotation(slug);
  if (callouts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]">
      {callouts.map((c, i) => {
        const isSite = c.n === "Site";
        const isSpawn = c.n === "Spawn";
        const attacker = /attack/i.test(c.s);
        const defender = /defend/i.test(c.s);

        let label = c.n;
        if (isSite) label = `${c.s} Site`;
        else if (isSpawn && attacker) label = "Attacker Spawn";
        else if (isSpawn && defender) label = "Defender Spawn";

        // All callouts are white; spawns are color-coded by side.
        const color = isSpawn
          ? attacker
            ? "#ff4655"
            : defender
              ? "#38bdf8"
              : "#ffffff"
          : "#ffffff";

        const p = rotatePoint(c.x, c.y, rot);

        return (
          <span
            key={`${c.n}-${i}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap uppercase tracking-wide ${
              isSite
                ? "text-xs font-bold"
                : isSpawn
                  ? "text-[10px] font-bold"
                  : "text-[9px] font-semibold"
            }`}
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              color,
              textShadow: "0 1px 3px rgba(0,0,0,0.95)",
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
