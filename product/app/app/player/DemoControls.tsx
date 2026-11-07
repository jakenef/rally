"use client";
// AI lane (Jake). Hidden presenter controls (025 ONB-5): press D, or the faint corner button.
import { useEffect, useState } from "react";

export type PreparedClip = { clipId: string; channel?: string; labeledLevel?: number; hasVideo: boolean };

export function DemoControls({ clips, onPick, onReset }: { clips: PreparedClip[]; onPick: (clipId: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "d" || e.key === "D") setOpen((o) => !o);
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <button type="button" className="dc-corner" aria-label="Demo controls" onClick={() => setOpen(true)} />
      {open ? (
        <div className="dc-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="dc-panel" role="dialog" aria-label="Demo controls" onClick={(e) => e.stopPropagation()}>
            <div className="dc-head">
              <span className="rl-label">Demo controls</span>
              <button type="button" className="dc-close" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="rl-body">Load a prepared clip as if it were uploaded. Saved analysis, no waiting.</p>
            <div className="dc-list">
              {clips.map((c, i) => (
                <button
                  type="button"
                  key={c.clipId}
                  className="dc-clip"
                  onClick={() => {
                    onPick(c.clipId);
                    setOpen(false);
                  }}
                >
                  <b>Clip {i + 1}</b>
                  <span>{c.channel ?? c.clipId}</span>
                  <span>{c.labeledLevel !== undefined ? `labeled ${c.labeledLevel.toFixed(1)}` : ""}</span>
                  <span>{c.hasVideo ? "tracking" : "YouTube only"}</span>
                </button>
              ))}
            </div>
            <div className="dc-links">
              <a href="/player/compare">Compare two players</a>
              <a href="/player/accuracy">Accuracy check</a>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                Reset to upload
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
