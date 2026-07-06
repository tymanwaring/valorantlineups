"use client";

import { useAgentFocus } from "@/lib/agentFocus";

// Lineup count badge for a map card. Reflects the global agent focus: when a
// main agent is set, it shows that agent's count on the map instead of the total.
export default function MapCardCount({
  total,
  byAgent,
}: {
  total: number;
  byAgent: Record<string, number>;
}) {
  const { focus, ready } = useAgentFocus();
  const n = ready && focus !== "all" ? (byAgent[focus] ?? 0) : total;
  return (
    <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white/90">
      {n} {n === 1 ? "lineup" : "lineups"}
    </span>
  );
}
