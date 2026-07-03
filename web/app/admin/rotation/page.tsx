"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAPS } from "@/lib/maps";

export default function RotationAdminPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/rotation")
      .then((r) => r.json())
      .then((d: { inRotation: string[] }) => {
        setSelected(new Set(d.inRotation));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    setStatus("idle");
    setMessage("");
  }

  async function save() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/rotation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inRotation: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStatus("done");
      setMessage("Rotation updated!");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const count = selected.size;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-foreground/70 hover:text-accent">
        &larr; Back to maps
      </Link>
      <h1 className="mt-2 font-display text-4xl tracking-widest">
        Map Rotation
      </h1>
      <p className="mt-2 text-foreground/60">
        Toggle which maps are currently in the competitive rotation.
        <span className="ml-1 text-foreground/40">
          ({count} {count === 1 ? "map" : "maps"} in rotation)
        </span>
      </p>

      {loading ? (
        <p className="mt-8 text-foreground/50">Loading…</p>
      ) : (
        <div className="mt-8 space-y-2">
          {MAPS.map((m) => {
            const on = selected.has(m.slug);
            return (
              <button
                key={m.slug}
                onClick={() => toggle(m.slug)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                  on
                    ? "border-accent/60 bg-accent/10"
                    : "border-panel-border bg-panel hover:border-panel-border/80"
                }`}
              >
                <span className="font-medium">{m.name}</span>
                <span
                  className={`relative h-6 w-11 rounded-full transition ${
                    on ? "bg-accent" : "bg-panel-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      on ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={save}
          disabled={status === "saving" || loading}
          className="rounded bg-accent px-6 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save rotation"}
        </button>
        {message && (
          <span className={status === "error" ? "text-accent" : "text-green-400"}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
