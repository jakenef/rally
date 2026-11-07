"use client";
// AI lane (Jake). Scene 2: the local clip with every player's tracked box drawn over it.
// The graded player is crimson and labeled; the others are thin outlines; background people are hidden.
import { useEffect, useRef, useState } from "react";

type Overlay = {
  fps: number;
  width: number;
  height: number;
  selected: number | null;
  frames: [number, [number, number, number, number, number][]][];
};

/** Boxes shorter than this share of the frame are people on other courts or in the stands. */
const MIN_HEIGHT = 0.1;

function frameAt(o: Overlay, t: number) {
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

export function TrackedVideo({ clipId, title }: { clipId: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    let live = true;
    fetch(`/player/overlay/${clipId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => live && setOverlay(o))
      .catch(() => live && setOverlay(null));
    return () => {
      live = false;
    };
  }, [clipId]);

  useEffect(() => {
    const v = video.current;
    const c = canvas.current;
    if (!v || !c || !overlay) return;
    let raf = 0;
    const crimson = cssVar(c, "--crimson", "#e5112d");
    const onCrimson = cssVar(c, "--on-crimson", "#ffffff");
    const draw = () => {
      const ctx = c.getContext("2d");
      const rect = v.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(rect.width * dpr)) c.width = Math.round(rect.width * dpr);
      if (c.height !== Math.round(rect.height * dpr)) c.height = Math.round(rect.height * dpr);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        if (show) {
          // where the video sits inside the element (object-fit: contain)
          const scale = Math.min(rect.width / overlay.width, rect.height / overlay.height);
          const w = overlay.width * scale;
          const h = overlay.height * scale;
          const ox = (rect.width - w) / 2;
          const oy = (rect.height - h) / 2;
          const [, boxes] = frameAt(overlay, v.currentTime);
          for (const [id, x1, y1, x2, y2] of boxes) {
            const sel = id === overlay.selected;
            if (!sel && y2 - y1 < MIN_HEIGHT) continue;
            const bx = ox + x1 * w;
            const by = oy + y1 * h;
            const bw = (x2 - x1) * w;
            const bh = (y2 - y1) * h;
            ctx.lineWidth = sel ? 3 : 1;
            ctx.strokeStyle = sel ? crimson : "rgba(255,255,255,0.75)";
            ctx.strokeRect(bx, by, bw, bh);
            if (sel) {
              const label = "GRADED BY GEMINI";
              ctx.font = "700 11px 'Mona Sans', Arial, sans-serif";
              const tw = ctx.measureText(label).width + 12;
              const ty = by - 18 < 0 ? by + bh : by - 18;
              ctx.fillStyle = crimson;
              ctx.fillRect(bx, ty, tw, 18);
              ctx.fillStyle = onCrimson;
              ctx.fillText(label, bx + 6, ty + 13);
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [overlay, show]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="pl-video">
        <video ref={video} src={`/player/video/${clipId}`} title={title} controls muted playsInline preload="metadata" />
        <canvas ref={canvas} className="pl-overlay" aria-hidden="true" />
      </div>
      <label className="pl-toggle">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} disabled={!overlay} />
        {overlay ? "Show tracked players" : "No tracking for this clip yet"}
      </label>
    </div>
  );
}
