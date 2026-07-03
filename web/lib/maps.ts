export type MapInfo = {
  slug: string;
  name: string;
  image: string;
  /** Bomb sites available on this map, in canonical order. */
  sites: string[];
};

// Most maps have two sites; Haven and Lotus have three. "Mid" is offered
// everywhere so mid-control lineups (walls, smokes) have a home.
const THREE_SITE = new Set(["haven", "lotus"]);

function sitesFor(slug: string): string[] {
  const base = THREE_SITE.has(slug) ? ["A", "B", "C"] : ["A", "B"];
  return [...base, "Mid"];
}

export const MAPS: MapInfo[] = [
  "Abyss",
  "Ascent",
  "Bind",
  "Breeze",
  "Corrode",
  "Fracture",
  "Haven",
  "Icebox",
  "Lotus",
  "Pearl",
  "Split",
  "Sunset",
].map((name) => {
  const slug = name.toLowerCase();
  return {
    slug,
    name,
    // ?v bump busts browser cache whenever the underlying image changes.
    image: `/maps/${name}.png?v=3`,
    sites: sitesFor(slug),
  };
});

export function getMap(slug: string): MapInfo | undefined {
  return MAPS.find((m) => m.slug === slug.toLowerCase());
}

/** Sites for a map slug, falling back to a sensible default when unknown. */
export function getMapSites(slug: string): string[] {
  return getMap(slug)?.sites ?? ["A", "B", "Mid"];
}
