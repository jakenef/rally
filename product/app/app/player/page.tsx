// AI lane (Jake). Scene 2, "Video to court": a YouTube rec clip, the player Gemini graded, their card, and Join.
import { tonight } from "@rally/fixtures";
import { Button, Caption, Headline } from "@rally/ui";
import { joinSession } from "./actions";
import { embedUrl, loadClips, profileForClip } from "./data";
import { PlayerCard } from "./PlayerCard";
import "./player.css";

export const dynamic = "force-dynamic";

export default async function Player({ searchParams }: { searchParams: Promise<{ clip?: string; joined?: string }> }) {
  const { clip: wanted, joined } = await searchParams;
  const { clips, usingSample } = loadClips();
  const clip = clips.find((c) => c.clipId === wanted) ?? clips[0];
  const profile = await profileForClip(clip);
  const embed = embedUrl(clip.source);

  return (
    <main className="rl-page">
      <Caption>{usingSample ? "Sample clip" : "Rec play, from YouTube"}</Caption>
      <Headline size="h1" parts={["Video to", { text: "court", serif: true }]} />
      {usingSample ? (
        <p className="rl-note">No clips processed yet. Showing the sample stats from fixtures; run the vision pipeline on the clips in demo/clips.md.</p>
      ) : null}
      {clips.length > 1 ? (
        <nav className="pl-clips" aria-label="Clips">
          {clips.map((c) => (
            <Button key={c.clipId} href={`/player?clip=${encodeURIComponent(c.clipId)}`} variant={c.clipId === clip.clipId ? "primary" : "light"}>
              {c.clipId}
            </Button>
          ))}
        </nav>
      ) : null}
      {joined ? <p className="pl-flash">{joined}</p> : null}
      <div className="pl-layout">
        <div className="pl-video">
          {embed ? (
            <iframe src={embed} title={`Clip ${clip.clipId}`} allow="encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <div className="pl-video-empty">The clip plays here once it has a YouTube link.</div>
          )}
        </div>
        <div style={{ display: "grid", gap: "var(--space-mini)" }}>
          <PlayerCard profile={profile} title="The player Gemini watched" />
          <form action={joinSession}>
            <input type="hidden" name="clip" value={clip.clipId} />
            <Button type="submit" iconAfter="arrow">
              Join Tuesday session, ${(tonight.priceCents / 100).toFixed(0)}
            </Button>
          </form>
          <Button href="/player/compare" variant="outline">
            Compare two players
          </Button>
        </div>
      </div>
    </main>
  );
}
