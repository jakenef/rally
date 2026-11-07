// AI lane (Jake). Scene 4, "Same rating, different game": two players at the same level, opposite styles.
// Uses two processed clips when there are at least two; until then, the scene 4 pair from the roster.
import { Caption, Headline } from "@rally/ui";
import { loadClips, profileForClip, scene4Pair } from "../data";
import { PlayerCard } from "../PlayerCard";
import "../player.css";

export const dynamic = "force-dynamic";

export default async function Compare({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const { clips, usingSample } = loadClips();
  let pair;
  let fromClips = false;
  if (!usingSample && clips.length >= 2) {
    const ca = clips.find((c) => c.clipId === a) ?? clips[0];
    const cb = clips.find((c) => c.clipId === b) ?? clips.find((c) => c !== ca)!;
    pair = await Promise.all([profileForClip(ca), profileForClip(cb)]);
    fromClips = true;
  } else {
    pair = scene4Pair();
  }
  return (
    <main className="rl-page">
      <Caption>Scene 4</Caption>
      <Headline size="h1" parts={["Same rating,", { text: "different", serif: true }, "game"]} />
      <p className="rl-body-lg">A rating can&apos;t tell these two apart. Their play style can, and Rally balances on both.</p>
      {!fromClips ? <p className="rl-note">Showing the scene 4 pair from the demo roster until two clips are processed.</p> : null}
      <div className="pl-pair">
        <PlayerCard profile={pair[0]} />
        <PlayerCard profile={pair[1]} />
      </div>
    </main>
  );
}
