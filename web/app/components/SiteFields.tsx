"use client";

import { getMapSites } from "@/lib/maps";

const PLANT_SPOT_SUGGESTIONS = [
  "Default",
  "A Default",
  "B Default",
  "C Default",
  "Behind Box",
  "Long",
  "Short",
  "Choke",
  "Corner",
  "Under Heaven",
  "Market",
  "Elbow",
];

// Renders a Site picker (options derived from the selected map) and, for attack
// lineups, a free-form Plant spot input. Emits form fields `site` and `plantSpot`.
export default function SiteFields({
  mapSlug,
  side,
  defaultSite,
  defaultPlantSpot,
}: {
  mapSlug: string;
  side: "Attack" | "Defense";
  defaultSite?: string;
  defaultPlantSpot?: string;
}) {
  const sites = getMapSites(mapSlug);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground/80">
          Site
        </span>
        <select
          name="site"
          key={mapSlug}
          defaultValue={defaultSite ?? ""}
          className={inputClass}
        >
          <option value="">N/A</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s === "Mid" ? "Mid" : `${s} Site`}
            </option>
          ))}
        </select>
      </label>

      {side === "Attack" && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">
            Plant spot
          </span>
          <input
            name="plantSpot"
            defaultValue={defaultPlantSpot ?? ""}
            list="plant-spot-suggestions"
            placeholder="e.g. Default, Behind Box"
            className={inputClass}
          />
          <datalist id="plant-spot-suggestions">
            {PLANT_SPOT_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-panel-border bg-background px-3 py-2 outline-none focus:border-accent";
