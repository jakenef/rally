// AI lane (Jake). Scene 2, "Video to court": a YouTube rec clip, the player Gemini graded, their card, and Join.
import { tonight } from "@rally/fixtures";
import { Button, Headline } from "@rally/ui";
import { joinSession } from "./actions";
import { embedUrl, loadClips, profileForClip, selectedPlayer } from "./data";
import { localVideoPath } from "./local";
import { PlayerCard } from "./PlayerCard";
import { TrackedVideo } from "./TrackedVideo";
import "./player.css";

export const dynamic = "force-dynamic";

export default async function Player({ searchParams }: { searchParams: Promise<{ clip?: string; joined?: string }> }) {
  const { clip: wanted, joined } = await searchParams;
  const { clips, usingSample } = loadClips();
  const clip = clips.find((c) => c.clipId === wanted) ?? clips[0];
  const profile = await profileForClip(clip, clips);
  const embed = embedUrl(clip);
  const graded = selectedPlayer(clip);
  const local = !usingSample && localVideoPath(clip.clipId) !== null;

  return (
    <main className="rl-page">
      <Headline size="h1" parts={["Video to", { text: "court", accent: true }]} />
      {usingSample ? (
        <p className="rl-note">Showing a sample player.</p>
      ) : null}
      {clips.length > 1 ? (
        <nav className="pl-clips" aria-label="Clips">
          {clips.map((c, i) => (
            <Button key={c.clipId} href={`/player?clip=${encodeURIComponent(c.clipId)}`} variant={c.clipId === clip.clipId ? "primary" : "light"}>
              {`Clip ${i + 1}${c.labeledLevel !== undefined ? ` · ${c.labeledLevel.toFixed(1)}` : ""}`}
            </Button>
          ))}
        </nav>
      ) : null}
      {joined ? <p className="pl-flash">{joined}</p> : null}
      <div className="pl-layout">
        <div style={{ display: "grid", gap: "8px" }}>
          {local ? (
            <TrackedVideo key={clip.clipId} clipId={clip.clipId} title={`Clip ${clip.clipId}`} />
          ) : (
            <div className="pl-video">
              {embed ? (
                <iframe src={embed} title={`Clip ${clip.clipId}`} allow="encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <div className="pl-video-empty">No video available.</div>
              )}
            </div>
          )}
          <span className="rl-label">
            {clip.channel ? `Video: ${clip.channel} on YouTube` : "Video"}
            {clip.labeledLevel !== undefined ? ` · uploader's label ${clip.labeledLevel.toFixed(1)}` : ""}
            {graded.measured === false ? " · graded by Gemini only" : ""}
          </span>
        </div>
        <div style={{ display: "grid", gap: "var(--space-mini)" }}>
          <PlayerCard profile={profile} title="Player profile" />
          <form action={joinSession}>
            <input type="hidden" name="clip" value={clip.clipId} />
            <Button type="submit" iconAfter="arrow">
              Join session · ${(tonight.priceCents / 100).toFixed(0)}
            </Button>
          </form>
          <div className="rl-row">
            <Button href="/player/compare" variant="outline">
              Compare players
            </Button>
            <Button href="/player/accuracy" variant="outline">
              View accuracy
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
