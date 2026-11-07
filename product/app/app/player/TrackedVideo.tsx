"use client";
// AI lane (Jake). The analyzed clip: every player's tracked box, YOU in crimson, and a callout each
// time Gemini saw you hit a shot, with running counts under the video (025 ONB-3, ONB-4).
import type { ShotEvent } from "@rally/types";
import { useEffect, useRef, useState } from "react";
import { calloutsAt, CALLOUT_SEC, countsAt } from "./shots";

type Frame = [number, [number, number, number, number, number][], (number | null)?];
type Overlay = { width: number; height: number; selected: number | null; frames: Frame[] };

/** Boxes shorter than this share of the frame are people on other courts or in the stands. */
const MIN_HEIGHT = 0.1;

function frameAt(o: Overlay, t: number): Frame {
  let lo = 0;
  let hi = o.frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (o.frames[mid][0] <= t) lo = mid;
    else hi = mid - 1;
  }
  return o.frames[lo];
}

function cssVar(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

export function TrackedVideo({
  videoUrl,
  overlayUrl,
  events,
  offsetSec,
  title,
  autoPlay = false,
  showCounts = true,
}: {
  videoUrl: string;
  overlayUrl: string | null;
  events: ShotEvent[];
  offsetSec: number;
  title: string;
  autoPlay?: boolean;
  /** Off while Gemini is still watching: there are no shots to count yet. */
  showCounts?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [show, setShow] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!overlayUrl) return;
    let live = true;
    fetch(overlayUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => live && setOverlay(o))
      .catch(() => live && setOverlay(null));
    return () => {
      live = false;
    };
  }, [overlayUrl]);

  useEffect(() => {
    const v = video.current;
    const c = canvas.current;
    if (!v || !c) return;
    let raf = 0;
    let lastTick = 0;
    const crimson = cssVar(c, "--crimson", "#e5112d");
    const onCrimson = cssVar(c, "--on-crimson", "#ffffff");
    const pill = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, ink: string, alpha: number, size = 13) => {
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `700 ${size}px 'Mona Sans', Arial, sans-serif`;
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, size + 9);
      ctx.fillStyle = ink;
      ctx.fillText(text, x + 7, y + size + 2);
      ctx.globalAlpha = 1;
    };
    const draw = (ts: number) => {
      const ctx = c.getContext("2d");
      const rect = v.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(rect.width * dpr)) c.width = Math.round(rect.width * dpr);
      if (c.height !== Math.round(rect.height * dpr)) c.height = Math.round(rect.height * dpr);
      const t = v.currentTime;
      if (ts - lastTick > 200) {
        lastTick = ts;
        setNow(t);
      }
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        const vw = overlay?.width || v.videoWidth || 16;
        const vh = overlay?.height || v.videoHeight || 9;
        const scale = Math.min(rect.width / vw, rect.height / vh);
        const w = vw * scale;
        const h = vh * scale;
        const ox = (rect.width - w) / 2;
        const oy = (rect.height - h) / 2;
        let you: { x: number; y: number; w: number; h: number } | null = null;
        if (show && overlay) {
          const [, boxes, followed] = frameAt(overlay, t);
          const sel = followed === undefined ? overlay.selected : followed;
          for (const [id, x1, y1, x2, y2] of boxes) {
            const isYou = id === sel;
            if (!isYou && y2 - y1 < MIN_HEIGHT) continue;
            const b = { x: ox + x1 * w, y: oy + y1 * h, w: (x2 - x1) * w, h: (y2 - y1) * h };
            ctx.lineWidth = isYou ? 3 : 1;
            ctx.strokeStyle = isYou ? crimson : "rgba(255,255,255,0.7)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            if (isYou) you = b;
          }
          if (you) pill(ctx, "YOU", you.x, you.y - 22 < oy ? you.y + you.h : you.y - 22, crimson, onCrimson, 1);
        }
        if (show) {
          // ONB-4: a callout near you for each shot Gemini saw, fading in and out
          calloutsAt(events, offsetSec, t).forEach((e, i) => {
            const age = t - (e.t - offsetSec);
            const alpha = Math.min(1, (CALLOUT_SEC - age) / 0.4, age / 0.12);
            const x = you ? Math.min(you.x + you.w + 8, ox + w - 220) : ox + 16;
            const y = (you ? you.y + 4 : oy + 16) + i * 30 - Math.min(age, 0.3) * 20;
            const text = e.label.toUpperCase();
            if (e.shot === "error") pill(ctx, text, x, y, "rgba(8,8,8,0.85)", "#ffffff", alpha, 15);
            else pill(ctx, text, x, y, crimson, onCrimson, alpha, 15);
          });
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [overlay, show, events, offsetSec]);

  const counts = countsAt(events, offsetSec, now).filter((c) => c.n > 0 || c.name !== "Errors");
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="pl-video">
        <video ref={video} src={videoUrl} title={title} controls muted playsInline preload="metadata" autoPlay={autoPlay} loop={!showCounts} />
        <canvas ref={canvas} className="pl-overlay" aria-hidden="true" />
      </div>
      {showCounts ? (
        <div className="pl-counts" aria-live="polite">
          {counts.map((c) => (
            <span key={c.name} className={c.n ? "pl-count pl-count-on" : "pl-count"}>
              <b>{c.n}</b> {c.name}
            </span>
          ))}
        </div>
      ) : null}
      <label className="pl-toggle" hidden={!showCounts}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        {overlay ? "Show tracking and shot callouts" : "Show shot callouts"}
      </label>
    </div>
  );
}
