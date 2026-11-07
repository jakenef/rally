// AI lane (Jake). Loads cached clip results and turns them into profiles with cards.
// Server-only: reads product/fixtures/clips/*.json and ANTHROPIC_API_KEY.
import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { roster, sampleStats, scene4Ids } from "@rally/fixtures";
import { buildProfile, writeCard } from "@rally/profiles";
import { claudeCardWriter } from "@rally/profiles/claude";
import type { ClipStats, PlayerStats, Profile } from "@rally/types";

function clipsDir(): string | null {
  for (const dir of [path.join(/* turbopackIgnore: true */ process.cwd(), "..", "fixtures", "clips"), path.join(/* turbopackIgnore: true */ process.cwd(), "fixtures", "clips")]) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

/** Final clip results (<clipId>.json), or the sample clip until the pipeline has run on real ones. */
export function loadClips(): { clips: ClipStats[]; usingSample: boolean } {
  const dir = clipsDir();
  const clips = dir
    ? readdirSync(dir)
        .filter((f) => /^[^.]+\.json$/.test(f))
        .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as ClipStats)
    : [];
  return clips.length ? { clips, usingSample: false } : { clips: [sampleStats], usingSample: true };
}

export const selectedPlayer = (clip: ClipStats): PlayerStats => clip.players.find((p) => p.selected) ?? clip.players[0];

/** YouTube link to an embeddable URL, keeping the start time (t=...). */
export function embedUrl(source: string): string | null {
  try {
    const u = new URL(source);
    const id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v");
    if (!id || id.startsWith("REPLACE")) return null;
    const t = u.searchParams.get("t") ?? u.searchParams.get("start");
    const start = t ? parseInt(t, 10) : 0;
    return `https://www.youtube-nocookie.com/embed/${id}?start=${start}&rel=0`;
  } catch {
    return null;
  }
}

const cards = new Map<string, Promise<Profile>>();

/** The selected player's profile with its card; Claude writes it if there's a key, cached per clip. */
export function profileForClip(clip: ClipStats): Promise<Profile> {
  const hit = cards.get(clip.clipId);
  if (hit) return hit;
  const stats = selectedPlayer(clip);
  const profile = buildProfile({ playerId: `clip-${clip.clipId}`, name: "New player", stats, durationSec: clip.durationSec });
  const done = writeCard({ profile, watched: stats.watched }, claudeCardWriter());
  cards.set(clip.clipId, done);
  return done;
}

/** Scene 4 pair from the roster: same skill, one hard hitter and one soft player. */
export function scene4Pair(): [Profile, Profile] {
  const group = scene4Ids.map((id) => roster.find((p) => p.playerId === id)!);
  const banger = group.reduce((a, b) => (b.style.power > a.style.power ? b : a));
  const dinker = group.reduce((a, b) => (b.style.power < a.style.power ? b : a));
  return [banger, dinker];
}
