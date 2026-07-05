"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only overflow menu overlaid on a map card. Lives above the card's
// stretched navigation link so its own clicks don't trigger navigation.
export default function MapCardMenu({
  slug,
  inRotation,
}: {
  slug: string;
  inRotation: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function editLabels(e: React.MouseEvent) {
    stop(e);
    setOpen(false);
    router.push(`/maps/${slug}/edit-labels`);
  }

  async function toggleRotation(e: React.MouseEvent) {
    stop(e);
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/rotation");
      const data = (await res.json()) as { inRotation?: string[] };
      const current = data.inRotation ?? [];
      const next = inRotation
        ? current.filter((s) => s !== slug)
        : Array.from(new Set([...current, slug]));
      await fetch("/api/rotation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inRotation: next }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="absolute right-2 top-2 z-[2]">
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        aria-label="Map options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg leading-none text-white/90 transition hover:bg-black/80"
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 overflow-hidden rounded-md border border-panel-border bg-panel shadow-xl"
          onClick={stop}
        >
          <button
            type="button"
            role="menuitem"
            onClick={editLabels}
            className="block w-full px-3 py-2 text-left text-sm text-foreground/80 transition hover:bg-panel-border"
          >
            Edit labels
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={toggleRotation}
            disabled={busy}
            className="block w-full px-3 py-2 text-left text-sm text-foreground/80 transition hover:bg-panel-border disabled:opacity-60"
          >
            {inRotation ? "Remove from rotation" : "Add to rotation"}
          </button>
        </div>
      )}
    </div>
  );
}
