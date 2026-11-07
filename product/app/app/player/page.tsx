import { sampleStats } from "@rally/fixtures";
import { Caption, Headline } from "@rally/ui";

// AI lane (Jake). Placeholder from the base layer: shows the sample clip's selected player.
// Step 2.2 replaces it with the YouTube link, tracking playback and the player card.
export default function Player() {
  const me = sampleStats.players.find((p) => p.selected)!;
  const w = me.watched!;
  return (
    <main className="rl-page">
      <Caption>Sample clip</Caption>
      <Headline size="h1" parts={["Video to", { text: "court", serif: true }]} />
      <p className="rl-note">Profiles aren&apos;t built yet (BUILD.md step 2.2). This page shows the sample clip stats from fixtures.</p>
      <div className="rl-grid">
        <div className="rl-tile">
          <h3>Gemini&apos;s read</h3>
          <span className="rl-body rl-num">
            Level {w.levelEstimate.low.toFixed(1)} to {w.levelEstimate.high.toFixed(1)}
          </span>
          {w.reasons.map((r) => (
            <span key={r} className="rl-body">
              {r}
            </span>
          ))}
        </div>
        <div className="rl-tile">
          <h3>Measured</h3>
          <span className="rl-body rl-num">Kitchen line {Math.round(me.kitchenLineShare * 100)}%</span>
          <span className="rl-body rl-num">Ready position {Math.round(me.readyPositionShare * 100)}%</span>
          <span className="rl-body rl-num">
            Speed {me.avgSpeedMps.toFixed(1)} m/s avg · {me.peakSpeedMps.toFixed(1)} peak
          </span>
        </div>
      </div>
    </main>
  );
}
