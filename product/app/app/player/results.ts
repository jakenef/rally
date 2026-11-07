// AI lane (Jake). What the result screen shows (025 Result), for a prepared clip or an upload.
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildProfile, fitCalibration, writeCard } from "@rally/profiles";
import { claudeCardWriter } from "@rally/profiles/claude";
import type { ClipStats, PlayerStats, Profile, ShotEvent } from "@rally/types";
import { calibrationFor, calibrationSamples, loadClips, selectedPlayer } from "./data";
import { jobDir } from "./jobs";
import { localVideoPath, overlayPath } from "./local";

export type Result = {
  kind: "clip" | "upload";
  id: string;
  videoUrl: string | null;
  youtubeUrl: string | null;
  overlayUrl: string | null;
  /** Subtract from event times to get the playing video's time. */
  offsetSec: number;
  events: ShotEvent[];
  profile: Profile;
  credit?: string;
  labeledLevel?: number;
};

const cards = new Map<string, Promise<Profile>>();

function withCard(key: string, profile: Profile, stats: PlayerStats): Promise<Profile> {
  const hit = cards.get(key);
  if (hit) return hit;
  const done = writeCard({ profile, watched: stats.watched }, claudeCardWriter(undefined, "you"));
  cards.set(key, done);
  return done;
}

/** A prepared clip, as if the player had uploaded it (demo controls, ONB-5). */
export async function clipResult(clipId: string): Promise<Result | null> {
  const { clips, usingSample } = loadClips();
  const clip = usingSample ? undefined : clips.find((c) => c.clipId === clipId);
  if (!clip) return null;
  const stats = selectedPlayer(clip);
  const profile = buildProfile({ playerId: `clip-${clip.clipId}`, name: "You", stats, durationSec: clip.durationSec, calibration: calibrationFor(clip, clips) });
  const hasLocal = localVideoPath(clip.clipId) !== null;
  return {
    kind: "clip",
    id: clip.clipId,
    videoUrl: hasLocal ? `/player/video/${clip.clipId}` : null,
    youtubeUrl: clip.source,
    overlayUrl: hasLocal && overlayPath(clip.clipId) ? `/player/overlay/${clip.clipId}` : null,
    offsetSec: hasLocal ? (clip.startSec ?? 0) : 0,
    events: stats.watched?.events ?? [],
    profile: await withCard(`clip:${clip.clipId}`, profile, stats),
    credit: clip.channel,
    labeledLevel: clip.labeledLevel,
  };
}

/** An uploaded clip, once Gemini has graded it. */
export async function uploadResult(jobId: string): Promise<Result | null> {
  const dir = jobDir(jobId);
  const graded = dir ? path.join(dir, "upload.gemini.json") : null;
  if (!dir || !graded || !existsSync(graded)) return null;
  const g = JSON.parse(readFileSync(graded, "utf8"));
  const stats: PlayerStats = { trackId: 0, selected: true, measured: false, watched: g.assessment };
  const { clips, usingSample } = loadClips();
  const calibration = usingSample ? null : fitCalibration(calibrationSamples(clips as ClipStats[]));
  const profile = buildProfile({ playerId: `upload-${jobId}`, name: "You", stats, durationSec: g.windowSec ?? 60, calibration });
  return {
    kind: "upload",
    id: jobId,
    videoUrl: `/player/api/jobs/${jobId}/video`,
    youtubeUrl: null,
    overlayUrl: existsSync(path.join(dir, "overlay.json")) ? `/player/api/jobs/${jobId}/overlay` : null,
    offsetSec: 0,
    events: g.assessment.events ?? [],
    profile: await withCard(`upload:${jobId}`, profile, stats),
  };
}
