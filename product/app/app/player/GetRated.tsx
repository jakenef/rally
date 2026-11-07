"use client";
// AI lane (Jake). Get your Rally rating (025): upload a clip, click yourself, watch the analysis, see YOUR card.
import { Button, Headline } from "@rally/ui";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { joinAsYou } from "./actions";
import { DemoControls, type PreparedClip } from "./DemoControls";
import { PlayerCard } from "./PlayerCard";
import type { Result } from "./results";
import { TrackedVideo } from "./TrackedVideo";

type Box = [number, number, number, number];
type Step = { name: string; state: "waiting" | "running" | "done" | "failed"; detail?: string };
type Status = { stage: string; steps?: Step[]; error?: string | null; result?: Result | null };

type View =
  | { at: "upload"; error?: string }
  | { at: "uploading"; name: string; pct: number }
  | { at: "pick"; jobId: string }
  | { at: "analyzing"; jobId: string | null; steps: Step[]; started: number }
  | { at: "result"; result: Result }
  | { at: "failed"; error: string };

function uploadFile(file: File, onPct: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/player/api/jobs");
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(e.loaded / e.total);
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status === 200 && body.jobId) resolve(body.jobId);
      else reject(new Error(body.error ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function GetRated({ prepared }: { prepared: PreparedClip[] }) {
  const [view, setView] = useState<View>({ at: "upload" });

  const start = async (file: File) => {
    setView({ at: "uploading", name: file.name, pct: 0 });
    try {
      const jobId = await uploadFile(file, (pct) => setView({ at: "uploading", name: file.name, pct }));
      setView({ at: "pick", jobId });
    } catch (e) {
      setView({ at: "upload", error: e instanceof Error ? e.message : "Upload failed" });
    }
  };

  const demo = async (clipId: string) => {
    const started = Date.now();
    setView({
      at: "analyzing",
      jobId: null,
      started,
      steps: [
        { name: "Tracking the players", state: "running", detail: "Loading saved tracking" },
        { name: "Gemini is watching you play", state: "running", detail: "Loading saved analysis" },
      ],
    });
    const res = await fetch(`/player/api/clips/${clipId}`);
    if (!res.ok) return setView({ at: "failed", error: "That prepared clip isn't available." });
    const result = (await res.json()) as Result;
    setView({ at: "result", result });
  };

  return (
    <main className="rl-page">
      {view.at === "result" ? (
        <Headline size="h1" className="ch-hl-outline" parts={["Your Rally", { text: "rating", accent: true }]} />
      ) : (
        <Headline size="h1" className="ch-hl-outline" parts={["Get your", { text: "rating", accent: true }]} />
      )}
      {view.at === "upload" || view.at === "uploading" ? <UploadStep view={view} onFile={start} /> : null}
      {view.at === "pick" ? (
        <PickStep jobId={view.jobId} onPicked={(steps) => setView({ at: "analyzing", jobId: view.jobId, steps, started: Date.now() })} onFail={(error) => setView({ at: "failed", error })} />
      ) : null}
      {view.at === "analyzing" ? (
        <AnalyzingStep
          jobId={view.jobId}
          initial={view.steps}
          started={view.started}
          onDone={(result) => setView({ at: "result", result })}
          onFail={(error) => setView({ at: "failed", error })}
        />
      ) : null}
      {view.at === "result" ? <ResultStep result={view.result} onAgain={() => setView({ at: "upload" })} /> : null}
      {view.at === "failed" ? (
        <div className="gr-panel">
          <p className="pl-flash">{view.error}</p>
          <Button onClick={() => setView({ at: "upload" })}>Try another clip</Button>
        </div>
      ) : null}
      <DemoControls clips={prepared} onPick={demo} onReset={() => setView({ at: "upload" })} />
    </main>
  );
}

// ---------- 1. upload ----------

function UploadStep({ view, onFile }: { view: Extract<View, { at: "upload" | "uploading" }>; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = view.at === "uploading";
  return (
    <div className="gr-panel">
      <p className="rl-body-lg">Upload a minute of you playing doubles. Rally finds you, watches every shot, and gives you an estimated DUPR and your play style.</p>
      <div
        className={`gr-drop${over ? " gr-drop-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f && !busy) onFile(f);
        }}
        onClick={() => !busy && input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && input.current?.click()}
        aria-label="Upload a video"
      >
        {busy ? (
          <>
            <span className="gr-drop-title">Uploading {view.name}</span>
            <div className="gr-bar" aria-hidden="true">
              <div style={{ width: `${Math.round(view.pct * 100)}%` }} />
            </div>
            <span className="rl-label">{Math.round(view.pct * 100)}%</span>
          </>
        ) : (
          <>
            <span className="gr-drop-title">Drop your video here</span>
            <span className="rl-label">or click to choose a file · MP4 or MOV · the first minute is analyzed</span>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {view.at === "upload" && view.error ? <p className="pl-flash">{view.error}</p> : null}
      <p className="rl-label">Best from behind the baseline, with the whole court in view.</p>
    </div>
  );
}

// ---------- 2. which one is you? ----------

function PickStep({ jobId, onPicked, onFail }: { jobId: string; onPicked: (steps: Step[]) => void; onFail: (error: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const [finding, setFinding] = useState(false);
  const [layout, setLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef(new Map<number, Box[]>());

  const measure = useCallback(() => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const r = v.getBoundingClientRect();
    const scale = Math.min(r.width / v.videoWidth, r.height / v.videoHeight);
    const w = v.videoWidth * scale;
    const h = v.videoHeight * scale;
    setLayout({ x: (r.width - w) / 2, y: (r.height - h) / 2, w, h });
  }, []);

  const find = useCallback(
    (t: number) => {
      const key = Math.round(t * 2) / 2;
      setAt(key);
      const hit = cache.current.get(key);
      if (hit) return setBoxes(hit);
      setBoxes(null);
      setFinding(true);
      fetch(`/player/api/jobs/${jobId}/players?t=${key}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) return onFail(d.error);
          cache.current.set(key, d.boxes);
          if (video.current && Math.abs(Math.round(video.current.currentTime * 2) / 2 - key) < 0.01) setBoxes(d.boxes);
        })
        .catch(() => onFail("Couldn't look at that frame. Try another clip."))
        .finally(() => setFinding(false));
    },
    [jobId, onFail],
  );

  const settle = () => {
    if (timer.current) clearTimeout(timer.current);
    const v = video.current;
    if (!v || !v.paused) {
      setBoxes(null);
      return;
    }
    timer.current = setTimeout(() => find(v.currentTime), 350);
  };

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const pick = async (box: Box) => {
    if (at === null) return;
    const res = await fetch(`/player/api/jobs/${jobId}/select`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: at, box }) });
    const body = await res.json();
    if (!res.ok) return onFail(body.error ?? "Couldn't start the analysis.");
    onPicked(body.steps ?? []);
  };

  return (
    <div className="gr-panel">
      <p className="rl-body-lg">Which one is you? Pause on a moment where you&apos;re easy to see, then click yourself.</p>
      <div className="pl-video gr-pick">
        <video
          ref={video}
          src={`/player/api/jobs/${jobId}/video`}
          controls
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            measure();
            e.currentTarget.currentTime = Math.min(2, (e.currentTarget.duration || 4) / 2);
          }}
          onSeeked={settle}
          onPause={settle}
          onPlay={() => setBoxes(null)}
        />
        {boxes?.map((b, i) => (
          <button
            key={i}
            type="button"
            className="gr-box"
            aria-label={`Player ${i + 1}: this is me`}
            style={{ left: layout.x + b[0] * layout.w, top: layout.y + b[1] * layout.h, width: (b[2] - b[0]) * layout.w, height: (b[3] - b[1]) * layout.h }}
            onClick={() => pick(b)}
          >
            <span>This is me</span>
          </button>
        ))}
      </div>
      <p className="rl-label" aria-live="polite">
        {finding ? "Finding players…" : boxes ? (boxes.length ? `${boxes.length} players found. Click yourself.` : "No players found here. Try another moment.") : "Pause the video to find the players."}
      </p>
    </div>
  );
}

// ---------- 3. analyzing ----------

function AnalyzingStep({ jobId, initial, started, onDone, onFail }: { jobId: string | null; initial: Step[]; started: number; onDone: (r: Result) => void; onFail: (e: string) => void }) {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => clearInterval(tick);
  }, [started]);
  useEffect(() => {
    if (!jobId) return;
    let live = true;
    const poll = async () => {
      if (!live) return;
      try {
        const s = (await (await fetch(`/player/api/jobs/${jobId}`)).json()) as Status;
        if (!live) return;
        if (s.steps?.length) setSteps(s.steps);
        if (s.stage === "done" && s.result) return onDone(s.result);
        if (s.stage === "failed") return onFail(s.error ?? "The analysis failed. Try another clip.");
      } catch {
        // keep polling through a blip
      }
      setTimeout(poll, 1000);
    };
    poll();
    return () => {
      live = false;
    };
  }, [jobId, onDone, onFail]);
  return (
    <div className="gr-panel">
      <p className="rl-body-lg">Rally is watching you play. This takes about a minute.</p>
      <ol className="gr-steps">
        {steps.map((s) => (
          <li key={s.name} className={`gr-step gr-step-${s.state}`}>
            <span className="gr-dot" aria-hidden="true" />
            <span className="gr-step-name">{s.name}</span>
            <span className="gr-step-detail">{s.state === "done" ? (s.detail ?? "Done") : s.state === "failed" ? `Failed: ${s.detail ?? ""}` : (s.detail ?? "Working")}</span>
          </li>
        ))}
      </ol>
      <span className="rl-label">{elapsed}s</span>
      {jobId ? (
        <TrackedVideo
          videoUrl={`/player/api/jobs/${jobId}/video`}
          overlayUrl={steps[0]?.state === "done" ? `/player/api/jobs/${jobId}/overlay` : null}
          events={[]}
          offsetSec={0}
          title="Your clip"
          autoPlay
          showCounts={false}
        />
      ) : null}
    </div>
  );
}

// ---------- 4. your rating ----------

function ResultStep({ result, onAgain }: { result: Result; onAgain: () => void }) {
  const [message, join, pending] = useActionState(joinAsYou, null);
  return (
    <div className="pl-layout">
      <div style={{ display: "grid", gap: 8 }}>
        {result.videoUrl ? (
          <TrackedVideo key={result.id} videoUrl={result.videoUrl} overlayUrl={result.overlayUrl} events={result.events} offsetSec={result.offsetSec} title="Your clip" autoPlay />
        ) : (
          <p className="rl-note">This clip isn&apos;t on this laptop, so there&apos;s no tracking to show.</p>
        )}
        {result.credit ? <span className="rl-label">Video: {result.credit} on YouTube</span> : null}
      </div>
      <div style={{ display: "grid", gap: "var(--space-mini)", alignContent: "start" }}>
        <PlayerCard profile={result.profile} title="Your Rally rating" you />
        <form action={join} className="gr-join">
          <input type="hidden" name="kind" value={result.kind} />
          <input type="hidden" name="id" value={result.id} />
          <input type="hidden" name="profile" value={JSON.stringify(result.profile)} />
          <label className="gr-field">
            <span className="rl-label">Your first name</span>
            <input name="name" required maxLength={40} autoComplete="given-name" />
          </label>
          <fieldset className="gr-tempo">
            <legend className="rl-label">The game you want</legend>
            {[
              ["soft", "Soft"],
              ["fast", "Fast"],
              ["any", "Either"],
            ].map(([v, label]) => (
              <label key={v}>
                <input type="radio" name="tempo" value={v} defaultChecked={v === "any"} />
                {label}
              </label>
            ))}
          </fieldset>
          <Button type="submit" iconAfter="arrow" disabled={pending}>
            {pending ? "Joining" : "Join Tuesday's session"}
          </Button>
          {message ? <p className="pl-flash">{message}</p> : null}
        </form>
        <Button variant="outline" onClick={onAgain}>
          Analyze another clip
        </Button>
      </div>
    </div>
  );
}
