"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import type { LineupStep, StepAnnotation } from "@/lib/types";
import {
  DEFAULT_STEP_CAPTIONS,
  DOUBLE_SHOCK_STEP_CAPTIONS,
} from "@/lib/types";
import {
  compressImage,
  readClipboardImage,
  setInputFile,
} from "@/lib/image-client";
import ImageAnnotator from "@/app/components/ImageAnnotator";

type Row = {
  id: number;
  caption: string;
  existingImage?: string;
  previewUrl?: string;
  fileName?: string;
  annotations?: StepAnnotation[];
};

let counter = 0;
const nextId = () => ++counter;

function defaultRows(doubleShock?: boolean): Row[] {
  const caps = doubleShock ? DOUBLE_SHOCK_STEP_CAPTIONS : DEFAULT_STEP_CAPTIONS;
  return caps.map((caption) => ({ id: nextId(), caption }));
}

function fromSteps(steps: LineupStep[]): Row[] {
  if (!steps || steps.length === 0) return defaultRows();
  return steps.map((s) => ({
    id: nextId(),
    caption: s.caption,
    existingImage: s.image,
    annotations: s.annotations,
  }));
}

export default function StepsEditor({
  initialSteps,
  doubleShock = false,
  lineupId,
  onAnnotationsSaved,
}: {
  initialSteps?: LineupStep[];
  doubleShock?: boolean;
  /** When editing an existing lineup, lets annotation saves persist instantly. */
  lineupId?: string;
  /** Called after annotations are persisted to the server (to refresh views). */
  onAnnotationsSaved?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => fromSteps(initialSteps ?? []));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [annotate, setAnnotate] = useState<{ id: number; src: string } | null>(
    null,
  );
  const [errorId, setErrorId] = useState<{ id: number; msg: string } | null>(
    null,
  );
  // Per-row instant-save status shown next to the Preview button.
  const [annStatus, setAnnStatus] = useState<{
    id: number;
    state: "saving" | "saved";
  } | null>(null);
  // Once the user edits steps we stop auto-populating defaults. Editing an
  // existing lineup counts as "touched" so we never clobber saved steps.
  const [touched, setTouched] = useState(() => (initialSteps?.length ?? 0) > 0);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  // Swap the default step scaffold when Double Shock toggles, unless the user
  // has already customized the steps.
  useEffect(() => {
    if (!touched) setRows(defaultRows(doubleShock));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doubleShock]);

  function update(id: number, patch: Partial<Row>) {
    setTouched(true);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /** Compress, load into the row's file input, and refresh its preview. */
  async function applyImage(id: number, file: File) {
    const input = fileInputs.current[id];
    if (!input) return;
    setBusyId(id);
    setErrorId(null);
    try {
      const compressed = await compressImage(file);
      setInputFile(input, compressed);
      update(id, {
        previewUrl: URL.createObjectURL(compressed),
        existingImage: undefined,
        fileName: compressed.name,
        annotations: undefined,
      });
    } catch {
      setErrorId({ id, msg: "Could not process that image." });
    } finally {
      setBusyId(null);
    }
  }

  async function pasteFromClipboard(id: number) {
    setBusyId(id);
    setErrorId(null);
    try {
      const file = await readClipboardImage();
      if (!file) {
        setErrorId({ id, msg: "No image found on the clipboard." });
        setBusyId(null);
        return;
      }
      await applyImage(id, file);
    } catch (e) {
      setErrorId({
        id,
        msg: e instanceof Error ? e.message : "Clipboard read failed.",
      });
      setBusyId(null);
    }
  }

  // Ctrl+V anywhere in the editor pastes into the active (red-bordered) step.
  function onContainerPaste(e: ClipboardEvent) {
    const file = Array.from(e.clipboardData?.items ?? [])
      .find((it) => it.type.startsWith("image/"))
      ?.getAsFile();
    if (!file) return; // Let non-image pastes (text) behave normally.
    const targetId = activeId ?? rows[0]?.id;
    if (targetId == null) return;
    e.preventDefault();
    void applyImage(targetId, file);
  }

  function addRow() {
    setTouched(true);
    setRows((rs) => [...rs, { id: nextId(), caption: "" }]);
  }

  function removeRow(id: number) {
    setTouched(true);
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function move(index: number, dir: -1 | 1) {
    setTouched(true);
    setRows((rs) => {
      const next = [...rs];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Persist a single step's annotations to the server right away, so the
  // annotator's "Save" sticks without submitting the whole edit form. Only
  // possible for already-saved images (existing lineup + server-hosted image);
  // brand-new pending uploads still save with the form.
  async function persistAnnotations(
    row: Row,
    annotations: StepAnnotation[],
  ): Promise<void> {
    if (!lineupId || !row.existingImage) return;
    setAnnStatus({ id: row.id, state: "saving" });
    try {
      const res = await fetch(`/api/lineups/${lineupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "annotations",
          image: row.existingImage,
          stepIndex: rows.findIndex((r) => r.id === row.id),
          annotations,
        }),
      });
      if (!res.ok) throw new Error();
      setAnnStatus({ id: row.id, state: "saved" });
      onAnnotationsSaved?.();
      setTimeout(
        () => setAnnStatus((s) => (s?.id === row.id ? null : s)),
        2000,
      );
    } catch {
      setAnnStatus((s) => (s?.id === row.id ? null : s));
      setErrorId({
        id: row.id,
        msg: "Couldn't save annotations now — they'll save when you submit the form.",
      });
    }
  }

  function onPickFile(id: number, input: HTMLInputElement) {
    const file = input.files?.[0];
    if (file) {
      void applyImage(id, file);
    } else {
      update(id, { previewUrl: undefined });
    }
  }

  return (
    <div className="space-y-3" onPaste={onContainerPaste}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/80">
          Steps ({rows.length})
        </span>
        <span className="text-xs text-foreground/40">
          Click a step, then Ctrl+V to paste
        </span>
      </div>

      {/* Lets the server know steps were submitted even if empty. */}
      <input type="hidden" name="steps-present" value="1" />

      {rows.map((row, i) => {
        const thumb = row.previewUrl || row.existingImage;
        return (
          <div
            key={row.id}
            onMouseDown={() => setActiveId(row.id)}
            onFocusCapture={() => setActiveId(row.id)}
            className={`rounded-lg border bg-background/40 p-3 transition-colors ${
              activeId === row.id
                ? "border-accent ring-1 ring-accent/40"
                : "border-panel-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded px-1 text-foreground/50 hover:text-accent disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <span className="text-center text-xs text-foreground/40">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="rounded px-1 text-foreground/50 hover:text-accent disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>

              {thumb ? (
                <button
                  type="button"
                  onClick={() => setAnnotate({ id: row.id, src: thumb })}
                  title="Open preview"
                  className="group relative h-16 w-24 shrink-0 overflow-hidden rounded border border-panel-border bg-black/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:opacity-80"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-semibold text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                    Preview
                  </span>
                </button>
              ) : (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded border border-panel-border bg-black/40 text-[10px] text-foreground/30">
                  no image
                </div>
              )}

              <div className="flex-1 space-y-2">
                <input
                  name={`step-${i}-caption`}
                  value={row.caption}
                  onChange={(e) => update(row.id, { caption: e.target.value })}
                  placeholder={`Caption (e.g. ${
                    DEFAULT_STEP_CAPTIONS[i] ?? "Step " + (i + 1)
                  })`}
                  className="w-full rounded-md border border-panel-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => {
                      fileInputs.current[row.id] = el;
                    }}
                    type="file"
                    name={`step-${i}-image`}
                    accept="image/*"
                    onChange={(e) => onPickFile(row.id, e.currentTarget)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputs.current[row.id]?.click()}
                    className="shrink-0 rounded border border-panel-border px-2 py-1 text-xs text-foreground/80 hover:border-accent/60 hover:text-accent"
                  >
                    Choose file
                  </button>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground/50">
                    {row.fileName ??
                      (row.existingImage ? "Current image" : "No file chosen")}
                  </span>
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard(row.id)}
                    disabled={busyId === row.id}
                    title="Paste an image copied to your clipboard"
                    className="shrink-0 rounded border border-panel-border px-2 py-1 text-xs text-foreground/80 hover:border-accent/60 hover:text-accent disabled:opacity-50"
                  >
                    {busyId === row.id ? "…" : "Paste"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      thumb && setAnnotate({ id: row.id, src: thumb })
                    }
                    disabled={!thumb}
                    title="Preview full size and draw circles"
                    className="shrink-0 rounded border border-panel-border px-2 py-1 text-xs text-foreground/80 hover:border-accent/60 hover:text-accent disabled:opacity-40"
                  >
                    {row.annotations?.length
                      ? `Preview (${row.annotations.length})`
                      : "Preview"}
                  </button>
                  {annStatus?.id === row.id && (
                    <span
                      className={`shrink-0 text-xs ${
                        annStatus.state === "saved"
                          ? "text-green-400"
                          : "text-foreground/50"
                      }`}
                    >
                      {annStatus.state === "saved" ? "Saved ✓" : "Saving…"}
                    </span>
                  )}
                </div>
                {errorId?.id === row.id && (
                  <p className="text-xs text-accent">{errorId.msg}</p>
                )}
                {row.existingImage && (
                  <input
                    type="hidden"
                    name={`step-${i}-existing`}
                    value={row.existingImage}
                  />
                )}
                {row.annotations && row.annotations.length > 0 && (
                  <input
                    type="hidden"
                    name={`step-${i}-annotations`}
                    value={JSON.stringify(row.annotations)}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded p-1 text-foreground/40 hover:text-accent"
                aria-label="Remove step"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-lg border border-dashed border-panel-border py-2 text-sm text-foreground/70 hover:border-accent/60 hover:text-accent"
      >
        + Add step
      </button>

      {annotate && (
        <ImageAnnotator
          src={annotate.src}
          initialAnnotations={rows.find((r) => r.id === annotate.id)?.annotations}
          onCancel={() => setAnnotate(null)}
          onApply={(annotations) => {
            const row = rows.find((r) => r.id === annotate.id);
            update(annotate.id, {
              annotations: annotations.length ? annotations : undefined,
            });
            if (row) void persistAnnotations(row, annotations);
            setAnnotate(null);
          }}
        />
      )}
    </div>
  );
}
