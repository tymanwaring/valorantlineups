"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StepAnnotation } from "@/lib/types";
import {
  ANNOTATION_COLORS,
  CIRCLE_THICKNESSES,
  ARROW_HEAD_SIZES,
  DEFAULT_CIRCLE_THICKNESS,
  DEFAULT_ARROW_HEAD,
  DEFAULT_TEXT_SIZE,
} from "@/lib/types";
import { AnnotationStage } from "@/app/components/AnnotatedImage";

type Tool = "select" | "circle" | "arrow" | "text";

type Op =
  | { kind: "drawCircle" | "drawArrow"; sx: number; sy: number; cx: number; cy: number }
  | { kind: "move"; index: number; sx: number; sy: number }
  | { kind: "resizeCircle" | "resizeText"; index: number }
  | { kind: "arrowEnd"; index: number; which: 1 | 2 };

type Edit = { index: number | null; x: number; y: number; value: string };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "circle", label: "○ Circle" },
  { id: "arrow", label: "→ Arrow" },
  { id: "text", label: "T Text" },
];

// Text size is stored as a fraction of image width; the picker shows it as a
// friendlier integer (fraction × 1000).
const TEXT_SIZE_MIN = 1;
const TEXT_SIZE_MAX = 250;
const toFontNumber = (size: number) => Math.round(size * 1000);
const fromFontNumber = (n: number) =>
  Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, n)) / 1000;

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function translate(a: StepAnnotation, dx: number, dy: number): StepAnnotation {
  if (a.type === "arrow") {
    return {
      ...a,
      x1: clamp01(a.x1 + dx),
      y1: clamp01(a.y1 + dy),
      x2: clamp01(a.x2 + dx),
      y2: clamp01(a.y2 + dy),
    };
  }
  return { ...a, x: clamp01(a.x + dx), y: clamp01(a.y + dy) };
}

export default function ImageAnnotator({
  src,
  initialAnnotations = [],
  onCancel,
  onApply,
}: {
  src: string;
  initialAnnotations?: StepAnnotation[];
  onCancel: () => void;
  onApply: (annotations: StepAnnotation[]) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [annotations, setAnnotations] = useState<StepAnnotation[]>(initialAnnotations);
  const [selected, setSelected] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(ANNOTATION_COLORS[0]);
  // Remembered color preferences, kept separately for shapes vs. text so text
  // can default to white while shapes stay on the last-used shape color.
  const [shapeColor, setShapeColor] = useState(ANNOTATION_COLORS[0]);
  const [textColor, setTextColor] = useState("#ffffff");
  const [thickness, setThickness] = useState<number>(DEFAULT_CIRCLE_THICKNESS);
  const [arrowHead, setArrowHead] = useState<number>(DEFAULT_ARROW_HEAD);
  const [textSize, setTextSize] = useState<number>(DEFAULT_TEXT_SIZE);
  // Raw string for the font-size field so it can be cleared while typing.
  const [fontStr, setFontStr] = useState(() =>
    String(toFontNumber(DEFAULT_TEXT_SIZE)),
  );
  const fontFocused = useRef(false);
  const [op, setOp] = useState<Op | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [past, setPast] = useState<StepAnnotation[][]>([]);
  const [future, setFuture] = useState<StepAnnotation[][]>([]);
  const [confirmClose, setConfirmClose] = useState(false);

  // Snapshot of what we opened with, to detect unsaved changes.
  const initialSnapshot = useRef(JSON.stringify(initialAnnotations ?? []));
  const dirty = JSON.stringify(annotations) !== initialSnapshot.current;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const requestCancel = () => {
    if (dirty) setConfirmClose(true);
    else onCancel();
  };

  // Refs mirror state so the window pointer handlers stay stable.
  const annRef = useRef(annotations);
  const opRef = useRef<Op | null>(null);
  const boxRef = useRef(box);
  const beforeRef = useRef<StepAnnotation[] | null>(null);
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  const arrowHeadRef = useRef(arrowHead);
  useEffect(() => void (annRef.current = annotations), [annotations]);
  // Keep the field in sync when size changes externally (e.g. selecting text),
  // but never while the user is actively editing it.
  useEffect(() => {
    if (!fontFocused.current) setFontStr(String(toFontNumber(textSize)));
  }, [textSize]);
  useEffect(() => void (boxRef.current = box), [box]);
  useEffect(() => void (colorRef.current = color), [color]);
  useEffect(() => void (thicknessRef.current = thickness), [thickness]);
  useEffect(() => void (arrowHeadRef.current = arrowHead), [arrowHead]);

  const setOpBoth = (o: Op | null) => {
    opRef.current = o;
    setOp(o);
  };

  function measure() {
    const img = imgRef.current;
    if (img) setBox({ w: img.clientWidth, h: img.clientHeight });
  }

  // ---- history ----
  const commit = useCallback((next: StepAnnotation[]) => {
    setPast((p) => [...p, annRef.current]);
    setFuture([]);
    setAnnotations(next);
  }, []);

  const pushHistory = useCallback((prev: StepAnnotation[]) => {
    setPast((p) => [...p, prev]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      setFuture((f) => [annRef.current, ...f]);
      setAnnotations(p[p.length - 1]);
      setSelected(null);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      setPast((p) => [...p, annRef.current]);
      setAnnotations(f[0]);
      setSelected(null);
      return f.slice(1);
    });
  }, []);

  // ---- geometry helpers ----
  const distW = useCallback((xN: number, yN: number, cxN: number, cyN: number) => {
    const { w, h } = boxRef.current;
    const dx = xN - cxN;
    const dy = ((yN - cyN) * h) / (w || 1);
    return Math.hypot(dx, dy);
  }, []);

  const ptFromEvent = useCallback((clientX: number, clientY: number) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return {
      px,
      py,
      x: clamp01(rect.width ? px / rect.width : 0),
      y: clamp01(rect.height ? py / rect.height : 0),
    };
  }, []);

  const hitTest = useCallback((px: number, py: number): number | null => {
    const { w, h } = boxRef.current;
    const anns = annRef.current;
    for (let i = anns.length - 1; i >= 0; i--) {
      const a = anns[i];
      if (a.type === "circle") {
        if (Math.hypot(px - a.x * w, py - a.y * h) <= a.r * w + 10) return i;
      } else if (a.type === "text") {
        const fs = a.size * w;
        const halfW = Math.max(fs * 0.6, a.text.length * fs * 0.32);
        const halfH = fs * 0.75;
        if (Math.abs(px - a.x * w) <= halfW && Math.abs(py - a.y * h) <= halfH)
          return i;
      } else if (a.type === "arrow") {
        if (distToSeg(px, py, a.x1 * w, a.y1 * h, a.x2 * w, a.y2 * h) <= 10)
          return i;
      }
    }
    return null;
  }, []);

  // ---- window pointer handlers (drive draw / move / resize) ----
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const o = opRef.current;
      if (!o) return;
      const { x, y } = ptFromEvent(e.clientX, e.clientY);
      if (o.kind === "drawCircle" || o.kind === "drawArrow") {
        setOpBoth({ ...o, cx: x, cy: y });
      } else if (o.kind === "move") {
        const before = beforeRef.current;
        if (!before) return;
        const dx = x - o.sx;
        const dy = y - o.sy;
        setAnnotations(before.map((a, i) => (i === o.index ? translate(a, dx, dy) : a)));
      } else if (o.kind === "resizeCircle") {
        setAnnotations((cur) =>
          cur.map((a, i) =>
            i === o.index && a.type === "circle"
              ? { ...a, r: Math.max(0.005, distW(x, y, a.x, a.y)) }
              : a,
          ),
        );
      } else if (o.kind === "resizeText") {
        setAnnotations((cur) =>
          cur.map((a, i) =>
            i === o.index && a.type === "text"
              ? { ...a, size: Math.min(0.25, Math.max(0.001, distW(x, y, a.x, a.y) * 1.1)) }
              : a,
          ),
        );
      } else if (o.kind === "arrowEnd") {
        setAnnotations((cur) =>
          cur.map((a, i) =>
            i === o.index && a.type === "arrow"
              ? o.which === 1
                ? { ...a, x1: x, y1: y }
                : { ...a, x2: x, y2: y }
              : a,
          ),
        );
      }
    }

    function onUp() {
      const o = opRef.current;
      if (!o) return;
      if (o.kind === "drawCircle") {
        const r = distW(o.cx, o.cy, o.sx, o.sy);
        // Only a near-zero drag (i.e. a plain click) gets a default size;
        // any real drag keeps its actual radius, however small.
        const rr = r < 0.004 ? 0.03 : r;
        commit([
          ...annRef.current,
          { type: "circle", x: o.sx, y: o.sy, r: rr, color: colorRef.current, t: thicknessRef.current },
        ]);
        setSelected(annRef.current.length);
      } else if (o.kind === "drawArrow") {
        if (Math.hypot(o.cx - o.sx, o.cy - o.sy) > 0.01) {
          commit([
            ...annRef.current,
            { type: "arrow", x1: o.sx, y1: o.sy, x2: o.cx, y2: o.cy, color: colorRef.current, t: thicknessRef.current, head: arrowHeadRef.current },
          ]);
          setSelected(annRef.current.length);
        }
      } else {
        // move / resize / arrowEnd: finalize history if something changed.
        const before = beforeRef.current;
        if (before && JSON.stringify(before) !== JSON.stringify(annRef.current)) {
          pushHistory(before);
        }
      }
      beforeRef.current = null;
      setOpBoth(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [commit, pushHistory, distW, ptFromEvent]);

  // ---- keyboard ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (edit) {
        if (e.key === "Escape") setEdit(null);
        return;
      }
      if (e.key === "Escape") {
        if (selected != null) setSelected(null);
        else if (dirtyRef.current) setConfirmClose(true);
        else onCancel();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected != null) {
        e.preventDefault();
        commit(annRef.current.filter((_, i) => i !== selected));
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [edit, selected, onCancel, undo, redo, commit]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ---- pointer down on the drawing surface ----
  function bgDown(e: React.PointerEvent) {
    if (edit) {
      commitEdit();
      return;
    }
    e.preventDefault();
    const { x, y, px, py } = ptFromEvent(e.clientX, e.clientY);
    if (tool === "select") {
      const i = hitTest(px, py);
      if (i == null) {
        setSelected(null);
        return;
      }
      setSelected(i);
      // Sync toolbar controls to the selected annotation so its pickers reflect
      // (and further tweaks apply to) the right shape.
      const picked = annRef.current[i];
      if (picked?.type === "arrow") {
        setArrowHead(picked.head ?? DEFAULT_ARROW_HEAD);
      }
      if (picked?.type === "text") setTextSize(picked.size);
      beforeRef.current = annRef.current;
      setOpBoth({ kind: "move", index: i, sx: x, sy: y });
    } else if (tool === "circle") {
      setOpBoth({ kind: "drawCircle", sx: x, sy: y, cx: x, cy: y });
    } else if (tool === "arrow") {
      setOpBoth({ kind: "drawArrow", sx: x, sy: y, cx: x, cy: y });
    } else if (tool === "text") {
      setEdit({ index: null, x, y, value: "" });
    }
  }

  function bgDoubleClick(e: React.MouseEvent) {
    const { px, py } = ptFromEvent(e.clientX, e.clientY);
    const i = hitTest(px, py);
    if (i != null && annotations[i].type === "text") {
      const a = annotations[i] as Extract<StepAnnotation, { type: "text" }>;
      setSelected(i);
      setTextSize(a.size);
      setEdit({ index: i, x: a.x, y: a.y, value: a.text });
    }
  }

  function commitEdit() {
    if (!edit) return;
    const v = edit.value.trim();
    if (edit.index == null) {
      if (v)
        commit([
          ...annRef.current,
          { type: "text", x: edit.x, y: edit.y, text: v, size: textSize, color, t: thickness },
        ]);
    } else {
      const idx = edit.index;
      if (!v) commit(annRef.current.filter((_, i) => i !== idx));
      else
        commit(
          annRef.current.map((a, i) =>
            i === idx && a.type === "text" ? { ...a, text: v } : a,
          ),
        );
    }
    setEdit(null);
  }

  function startResize(kind: Op["kind"], index: number, e: React.PointerEvent, which?: 1 | 2) {
    e.stopPropagation();
    e.preventDefault();
    beforeRef.current = annRef.current;
    setOpBoth(
      kind === "arrowEnd"
        ? { kind: "arrowEnd", index, which: which ?? 1 }
        : ({ kind, index } as Op),
    );
  }

  // Apply the current color/thickness to the selected annotation too.
  function pickColor(c: string) {
    setColor(c);
    // Remember the choice against the right context (text vs. shape) so it
    // sticks for future annotations of that kind.
    const textContext =
      tool === "text" ||
      (selected != null && annRef.current[selected]?.type === "text");
    if (textContext) setTextColor(c);
    else setShapeColor(c);
    if (selected != null) {
      commit(annRef.current.map((a, i) => (i === selected ? { ...a, color: c } : a)));
    }
  }
  function pickThickness(t: number) {
    setThickness(t);
    if (selected != null) {
      commit(annRef.current.map((a, i) => (i === selected ? { ...a, t } : a)));
    }
  }
  function pickTextSize(size: number) {
    setTextSize(size);
    if (selected != null && annRef.current[selected]?.type === "text") {
      commit(
        annRef.current.map((a, i) =>
          i === selected && a.type === "text" ? { ...a, size } : a,
        ),
      );
    }
  }
  function pickArrowHead(head: number) {
    setArrowHead(head);
    if (selected != null && annRef.current[selected]?.type === "arrow") {
      commit(
        annRef.current.map((a, i) =>
          i === selected && a.type === "arrow" ? { ...a, head } : a,
        ),
      );
    }
  }

  // Live draft while drawing.
  const draft: StepAnnotation | null =
    op?.kind === "drawCircle"
      ? { type: "circle", x: op.sx, y: op.sy, r: Math.max(distW(op.cx, op.cy, op.sx, op.sy), 0.004), color, t: thickness }
      : op?.kind === "drawArrow"
        ? { type: "arrow", x1: op.sx, y1: op.sy, x2: op.cx, y2: op.cy, color, t: thickness, head: arrowHead }
        : null;

  const { w, h } = box;
  const sel = selected != null ? annotations[selected] : null;
  const cursor =
    tool === "select" ? "default" : tool === "text" ? "text" : "crosshair";

  const Handle = ({ hx, hy, onDown }: { hx: number; hy: number; onDown: (e: React.PointerEvent) => void }) => (
    <div
      onPointerDown={onDown}
      className="pointer-events-auto absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-accent bg-white shadow"
      style={{ left: hx, top: hy }}
    />
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-start overflow-y-auto bg-black/90 p-3 sm:justify-center sm:p-4">
      {/* Toolbar — single scrollable row on phones, wraps + centers on wider. */}
      <div className="mb-3 flex w-full max-w-[95vw] items-center gap-2 overflow-x-auto rounded-lg border border-panel-border bg-panel px-3 py-2 [&>*]:shrink-0 sm:flex-wrap sm:justify-center sm:overflow-visible">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTool(t.id);
              if (t.id !== "select") setSelected(null);
              setColor(t.id === "text" ? textColor : shapeColor);
            }}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              tool === t.id
                ? "bg-accent text-white"
                : "border border-panel-border text-foreground/80 hover:border-accent/60"
            }`}
          >
            {t.label}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-panel-border" />
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pickColor(c)}
            aria-label={`Color ${c}`}
            className={`h-6 w-6 rounded-full border-2 transition ${
              color === c ? "scale-110 border-white" : "border-white/30"
            }`}
            style={{ background: c }}
          />
        ))}

        <span className="mx-1 h-5 w-px bg-panel-border" />
        <span className="text-xs text-foreground/60">Weight</span>
        {CIRCLE_THICKNESSES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => pickThickness(t.value)}
            aria-label={`Thickness ${t.label}`}
            className={`flex h-6 w-7 items-center justify-center rounded border transition ${
              thickness === t.value
                ? "border-accent bg-accent/20 text-accent"
                : "border-panel-border text-foreground/70 hover:border-accent/60"
            }`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: 3 + t.value * 800, height: 3 + t.value * 800 }}
            />
          </button>
        ))}

        {(tool === "arrow" || sel?.type === "arrow") && (
          <>
            <span className="mx-1 h-5 w-px bg-panel-border" />
            <span className="text-xs text-foreground/60">Head</span>
            {ARROW_HEAD_SIZES.map((hSize) => (
              <button
                key={hSize.label}
                type="button"
                onClick={() => pickArrowHead(hSize.value)}
                aria-label={`Arrowhead ${hSize.label}`}
                className={`flex h-6 w-7 items-center justify-center rounded border text-xs transition ${
                  arrowHead === hSize.value
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-panel-border text-foreground/70 hover:border-accent/60"
                }`}
              >
                {hSize.label}
              </button>
            ))}
          </>
        )}

        {(tool === "text" || sel?.type === "text") && (
          <>
            <span className="mx-1 h-5 w-px bg-panel-border" />
            <span className="text-xs text-foreground/60">Font</span>
            <input
              type="number"
              min={TEXT_SIZE_MIN}
              max={TEXT_SIZE_MAX}
              step={2}
              value={fontStr}
              onFocus={() => {
                fontFocused.current = true;
              }}
              onKeyDown={(e) => {
                // Enter would submit the surrounding form — confirm instead.
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onChange={(e) => {
                const raw = e.target.value;
                setFontStr(raw);
                const n = Number(raw);
                if (raw !== "" && Number.isFinite(n) && n > 0) {
                  pickTextSize(fromFontNumber(n));
                }
              }}
              onBlur={() => {
                fontFocused.current = false;
                const n = Number(fontStr);
                if (fontStr === "" || !Number.isFinite(n) || n <= 0) {
                  setFontStr(String(toFontNumber(textSize)));
                } else {
                  const size = fromFontNumber(n);
                  pickTextSize(size);
                  setFontStr(String(toFontNumber(size)));
                }
              }}
              className="h-6 w-16 rounded border border-panel-border bg-background px-2 text-xs outline-none focus:border-accent"
            />
          </>
        )}

        <span className="mx-1 h-5 w-px bg-panel-border" />
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          className="rounded border border-panel-border px-2 py-1 text-xs hover:border-accent/60 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Ctrl+Shift+Z)"
          className="rounded border border-panel-border px-2 py-1 text-xs hover:border-accent/60 disabled:opacity-40"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => {
            commit([]);
            setSelected(null);
          }}
          disabled={annotations.length === 0}
          className="rounded border border-panel-border px-2 py-1 text-xs hover:border-accent/60 disabled:opacity-40"
        >
          Clear
        </button>

        <span className="mx-1 h-5 w-px bg-panel-border" />
        <button
          type="button"
          onClick={requestCancel}
          className="rounded border border-panel-border px-3 py-1 text-xs hover:border-accent/60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply(annotations)}
          className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white"
        >
          Save
        </button>
      </div>

      <p className="mb-2 text-center text-xs text-foreground/50">
        {tool === "select"
          ? "Click a shape to select, drag to move, use handles to resize. Double-click text to edit. Delete removes it."
          : tool === "text"
            ? "Click where you want the label, then type."
            : "Click-drag to draw."}
      </p>

      {/* Image + draw surface */}
      <div className="relative inline-block max-h-[62vh] max-w-[95vw] sm:max-h-[78vh] sm:max-w-[92vw]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="Annotate"
          onLoad={measure}
          className="max-h-[62vh] max-w-[95vw] select-none rounded-lg border border-panel-border object-contain sm:max-h-[78vh] sm:max-w-[92vw]"
          draggable={false}
        />
        <div
          ref={overlayRef}
          className="absolute inset-0 touch-none"
          style={{ cursor }}
          onPointerDown={bgDown}
          onDoubleClick={bgDoubleClick}
        >
          <AnnotationStage annotations={annotations} box={{ w, h }} />
          {draft && <AnnotationStage annotations={[draft]} box={{ w, h }} />}

          {/* Selection highlight + handles (select tool only) */}
          {tool === "select" && sel && selected != null && (
            <>
              {sel.type === "circle" && (
                <>
                  <div
                    className="pointer-events-none absolute rounded-full border border-dashed border-white/70"
                    style={{
                      left: sel.x * w - sel.r * w,
                      top: sel.y * h - sel.r * w,
                      width: sel.r * w * 2,
                      height: sel.r * w * 2,
                    }}
                  />
                  <Handle
                    hx={sel.x * w + sel.r * w}
                    hy={sel.y * h}
                    onDown={(e) => startResize("resizeCircle", selected, e)}
                  />
                </>
              )}
              {sel.type === "text" && (
                <Handle
                  hx={sel.x * w + Math.max(sel.size * w * 0.6, sel.text.length * sel.size * w * 0.32)}
                  hy={sel.y * h + sel.size * w * 0.75}
                  onDown={(e) => startResize("resizeText", selected, e)}
                />
              )}
              {sel.type === "arrow" && (
                <>
                  <Handle
                    hx={sel.x1 * w}
                    hy={sel.y1 * h}
                    onDown={(e) => startResize("arrowEnd", selected, e, 1)}
                  />
                  <Handle
                    hx={sel.x2 * w}
                    hy={sel.y2 * h}
                    onDown={(e) => startResize("arrowEnd", selected, e, 2)}
                  />
                </>
              )}
            </>
          )}

          {/* Inline text editor */}
          {edit && (
            <input
              autoFocus
              value={edit.value}
              onChange={(e) => setEdit({ ...edit, value: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit();
                }
              }}
              placeholder="Label…"
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded border border-accent bg-black/80 px-1 text-center font-bold text-white outline-none"
              style={{
                left: edit.x * w,
                top: edit.y * h,
                fontSize: textSize * w,
                minWidth: 40,
              }}
            />
          )}
        </div>
      </div>

      {confirmClose && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xs rounded-lg border border-panel-border bg-panel p-4 text-center shadow-xl">
            <p className="text-sm font-semibold">Discard changes?</p>
            <p className="mt-1 text-xs text-foreground/60">
              Your annotation edits haven&apos;t been saved.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded border border-panel-border px-3 py-1.5 text-xs hover:border-accent/60"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClose(false);
                  onCancel();
                }}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
