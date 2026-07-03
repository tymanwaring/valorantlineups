"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAPS } from "@/lib/maps";
import { AGENTS, getAgent } from "@/lib/agents";
import StepsEditor from "@/app/components/StepsEditor";
import SovaFields from "@/app/components/SovaFields";
import JumpCheckbox from "@/app/components/JumpCheckbox";
import SiteFields from "@/app/components/SiteFields";

export default function AdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [agentSlug, setAgentSlug] = useState("");
  const [mapSlug, setMapSlug] = useState("");
  const [ability, setAbility] = useState("");
  const [doubleShock, setDoubleShock] = useState(false);
  const [side, setSide] = useState<"Attack" | "Defense">("Attack");
  const abilities = getAgent(agentSlug)?.abilities ?? [];
  const isDoubleShock =
    agentSlug === "sova" && ability === "Shock Dart" && doubleShock;

  // Prefill map/side/agent when launched from a specific map + side view.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get("map");
    if (m && MAPS.some((x) => x.slug === m)) setMapSlug(m);
    const s = p.get("side");
    if (s === "Attack" || s === "Defense") setSide(s);
    const a = p.get("agent");
    if (a && getAgent(a)) setAgentSlug(a);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/lineups", { method: "POST", body: data });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      setStatus("done");
      setMessage("Lineup added!");
      form.reset();
      setAgentSlug("");
      setMapSlug("");
      setAbility("");
      setDoubleShock(false);
      setSide("Attack");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-foreground/70 hover:text-accent">
        &larr; Back to maps
      </Link>
      <h1 className="mt-2 font-display text-4xl tracking-widest">Add Lineup</h1>
      <p className="mt-2 text-foreground/60">
        Fill in the details and optionally attach stand / aim / result
        screenshots.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Map">
            <select
              name="mapSlug"
              required
              className={mutedIf(!mapSlug)}
              value={mapSlug}
              onChange={(e) => setMapSlug(e.target.value)}
            >
              <option value="" disabled>
                Select a map
              </option>
              {MAPS.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agent">
            <select
              name="agentSlug"
              required
              className={mutedIf(!agentSlug)}
              value={agentSlug}
              onChange={(e) => {
                setAgentSlug(e.target.value);
                setAbility("");
                setDoubleShock(false);
              }}
            >
              <option value="" disabled>
                Select an agent
              </option>
              {AGENTS.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Title">
          <input
            name="title"
            required
            placeholder="e.g. A Site Recon Dart from Spawn"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Ability">
            <select
              name="ability"
              className={mutedIf(!ability)}
              value={ability}
              onChange={(e) => {
                setAbility(e.target.value);
                setDoubleShock(false);
              }}
              disabled={!agentSlug}
            >
              <option value="" disabled>
                {agentSlug ? "Select an ability" : "Select an agent first"}
              </option>
              {abilities.map((ab) => (
                <option key={ab} value={ab}>
                  {ab}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Side">
            <select
              name="side"
              className={selectClass}
              value={side}
              onChange={(e) =>
                setSide(e.target.value === "Defense" ? "Defense" : "Attack")
              }
            >
              <option value="Attack">Attack</option>
              <option value="Defense">Defense</option>
            </select>
          </Field>
        </div>

        <SiteFields mapSlug={mapSlug} side={side} />

        <SovaFields
          show={agentSlug === "sova"}
          showDoubleShock={ability === "Shock Dart"}
          doubleShock={doubleShock}
          onDoubleShockChange={setDoubleShock}
        />

        <JumpCheckbox show={!!agentSlug && agentSlug !== "sova"} />

        <Field label="Notes / instructions">
          <textarea
            name="notes"
            rows={4}
            placeholder="Where to stand, how to aim, charges/bounces, activation timing…"
            className={inputClass}
          />
        </Field>

        <StepsEditor doubleShock={isDoubleShock} />

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded bg-accent px-6 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save Lineup"}
          </button>
          {message && (
            <span
              className={
                status === "error" ? "text-accent" : "text-green-400"
              }
            >
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-panel-border bg-background px-3 py-2 outline-none focus:border-accent";
const selectClass = inputClass;

// Grey the select text like a placeholder while no value is chosen.
const mutedIf = (empty: boolean) =>
  `${selectClass}${empty ? " text-foreground/40" : ""}`;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">
        {label}
      </span>
      {children}
    </label>
  );
}
