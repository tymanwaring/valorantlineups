import type { Lineup } from "./types";

// Build a shareable deep link that opens a specific lineup on its map.
export function lineupLink(l: Lineup): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/maps/${l.mapSlug}?side=${l.side}&lineup=${l.id}`;
}
