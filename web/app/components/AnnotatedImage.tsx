"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StepAnnotation } from "@/lib/types";
import { arrowHeadPoints, strokePx } from "@/lib/annotations";

type Box = { w: number; h: number; ox: number; oy: number };

/**
 * Draws all annotation types onto a content box of width/height `w`/`h`.
 * Coordinates are normalized (x by width, y by height). Reused by both the
 * read-only display and (via the same math) the editor overlay.
 */
export function AnnotationStage({
  annotations,
  box,
}: {
  annotations: StepAnnotation[];
  box: { w: number; h: number };
}) {
  const { w, h } = box;
  return (
    <>
      {/* Vector layer: arrows + crosshair dots. */}
      <svg
        className="pointer-events-none absolute inset-0"
        width={w}
        height={h}
        style={{ overflow: "visible" }}
      >
        {annotations.map((a, i) => {
          if (a.type === "arrow") {
            const x1 = a.x1 * w;
            const y1 = a.y1 * h;
            const x2 = a.x2 * w;
            const y2 = a.y2 * h;
            const lw = strokePx(a, w);
            const head = Math.max(lw * 3.5, w * 0.02);
            return (
              <g key={i} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={a.color}
                  strokeWidth={lw}
                  strokeLinecap="round"
                />
                <polygon
                  points={arrowHeadPoints(x1, y1, x2, y2, head)}
                  fill={a.color}
                />
              </g>
            );
          }
          if (a.type === "dot") {
            const cx = a.x * w;
            const cy = a.y * h;
            const arm = a.r * w;
            const lw = strokePx(a, w);
            return (
              <g
                key={i}
                stroke={a.color}
                strokeWidth={lw}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
              >
                <line x1={cx - arm} y1={cy} x2={cx + arm} y2={cy} />
                <line x1={cx} y1={cy - arm} x2={cx} y2={cy + arm} />
                <circle cx={cx} cy={cy} r={arm * 0.32} fill="none" />
              </g>
            );
          }
          return null;
        })}
      </svg>

      {/* HTML layer: circles + text. */}
      {annotations.map((a, i) => {
        if (a.type === "circle") {
          const rp = a.r * w;
          return (
            <div
              key={i}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: a.x * w - rp,
                top: a.y * h - rp,
                width: rp * 2,
                height: rp * 2,
                border: `${strokePx(a, w)}px solid ${a.color}`,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
              }}
            />
          );
        }
        if (a.type === "text") {
          return (
            <div
              key={i}
              className="pointer-events-none absolute whitespace-pre font-bold leading-none"
              style={{
                left: a.x * w,
                top: a.y * h,
                transform: "translate(-50%, -50%)",
                color: a.color,
                fontSize: a.size * w,
                textShadow: "0 1px 3px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
              }}
            >
              {a.text}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

/**
 * Renders an image with annotations overlaid. Computes the actual content box
 * (handling `object-contain` letterboxing) so overlays line up precisely.
 */
export default function AnnotatedImage({
  src,
  annotations,
  alt = "",
  className = "",
  imgClassName = "",
  fit = "contain",
}: {
  src: string;
  annotations?: StepAnnotation[];
  alt?: string;
  className?: string;
  imgClassName?: string;
  /**
   * "contain": image fills a sized container with object-contain (letterboxed);
   * "native": image flows at its natural aspect (w-full, auto height).
   */
  fit?: "contain" | "native";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setBox({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const content: Box | null = (() => {
    if (!box.w || !box.h) return null;
    if (fit === "native") return { w: box.w, h: box.h, ox: 0, oy: 0 };
    if (!nat) return null;
    const ca = box.w / box.h;
    const ia = nat.w / nat.h;
    if (ia > ca) {
      const w = box.w;
      const hh = w / ia;
      return { w, h: hh, ox: 0, oy: (box.h - hh) / 2 };
    }
    const hh = box.h;
    const w = hh * ia;
    return { w, h: hh, ox: (box.w - w) / 2, oy: 0 };
  })();

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          setNat({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          });
          measure();
        }}
        className={
          fit === "native"
            ? `block h-auto w-full ${imgClassName}`
            : `absolute inset-0 h-full w-full object-contain ${imgClassName}`
        }
      />
      {content && annotations && annotations.length > 0 && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: content.ox,
            top: content.oy,
            width: content.w,
            height: content.h,
          }}
        >
          <AnnotationStage annotations={annotations} box={content} />
        </div>
      )}
    </div>
  );
}
