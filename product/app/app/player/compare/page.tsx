// AI lane (Jake). Scene 4, "Same rating, different game": two players at the same level, opposite styles.
// Uses the two clips marked "scene 4" in demo/clips.md; until there are two, the scene 4 pair from the roster.
import { Headline } from "@rally/ui";
import { loadClips, profileForClip, scene4Clips, scene4Pair } from "../data";
import { PlayerCard } from "../PlayerCard";
import "../player.css";

export const dynamic = "force-dynamic";

export default async function Compare() {
  const { clips, usingSample } = loadClips();
  const marked = usingSample ? null : scene4Clips(clips);
  const pair = marked ? await Promise.all([profileForClip(marked[0], clips), profileForClip(marked[1], clips)]) : scene4Pair();
  return (
    <main className="rl-page">
      <Headline size="h1" parts={["Same rating,", { text: "different game", accent: true }]} />
      {marked ? (
        <span className="rl-label">
          Videos: {marked.map((c) => c.channel ?? c.clipId).join(" and ")} on YouTube
        </span>
      ) : (
        <p className="rl-note">Showing sample players.</p>
      )}
      <div className="pl-pair">
        <PlayerCard profile={pair[0]} title={marked ? `Clip: ${marked[0].channel ?? marked[0].clipId}` : undefined} />
        <PlayerCard profile={pair[1]} title={marked ? `Clip: ${marked[1].channel ?? marked[1].clipId}` : undefined} />
      </div>
    </main>
  );
}
