// AI lane (Jake). Scene 5, "We checked ourselves": every labeled clip, estimated without its own label.
import { midpointOf } from "@rally/profiles";
import { Headline } from "@rally/ui";
import { accuracyReport, loadClips } from "../data";
import "../player.css";

export const dynamic = "force-dynamic";

const LO = 2.5;
const HI = 5.5;
const x = (v: number) => `${((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * 100}%`;

export default function Accuracy() {
  const { clips, usingSample } = loadClips();
  const report = accuracyReport(usingSample ? [] : clips);
  const byId = new Map(clips.map((c) => [c.clipId, c]));
  const n = report.rows.length;
  return (
    <main className="rl-page">
      <Headline size="h1">Accuracy</Headline>
      {n === 0 ? (
        <p className="rl-note">No labeled clips yet.</p>
      ) : (
        <>
          <p className="rl-body-lg">
            {n} clips. Each estimate uses a correction fitted on the other clips.
          </p>
          <div className="ac-stats">
            <div className="ac-stat">
              <span className="ac-num">{report.rawMeanError.toFixed(2)}</span>
              <span className="rl-label">Gemini alone, average miss</span>
            </div>
            <div className="ac-stat">
              <span className="ac-num">{report.meanError.toFixed(2)}</span>
              <span className="rl-label">Rally, average miss</span>
            </div>
            <div className="ac-stat">
              <span className="ac-num">
                {report.within(0.5)}/{n}
              </span>
              <span className="rl-label">Within half a point</span>
            </div>
          </div>
          <div className="ac-chart" role="table" aria-label="Labeled level against Rally's estimate">
            <div className="ac-axis" aria-hidden="true">
              {[3, 3.5, 4, 4.5, 5].map((v) => (
                <span key={v} style={{ left: x(v) }}>
                  {v.toFixed(1)}
                </span>
              ))}
            </div>
            {report.rows.map((r) => {
              const c = byId.get(r.clipId!);
              return (
                <div className="ac-row" role="row" key={r.clipId}>
                  <span className="ac-name" role="cell">
                    {c?.channel ?? r.clipId}
                  </span>
                  <div className="ac-track" role="cell" aria-label={`Labeled ${r.labeled}, Gemini ${r.gemini.low} to ${r.gemini.high}, Rally ${r.estimate.low} to ${r.estimate.high}`}>
                    <span className="ac-gemini" style={{ left: x(r.gemini.low), width: `calc(${x(r.gemini.high)} - ${x(r.gemini.low)})` }} />
                    <span className="ac-rally" style={{ left: x(r.estimate.low), width: `calc(${x(r.estimate.high)} - ${x(r.estimate.low)})` }} />
                    <span className="ac-label" style={{ left: x(r.labeled) }} />
                  </div>
                  <span className="ac-err rl-num" role="cell">
                    {(midpointOf(r.estimate) - r.labeled >= 0 ? "+" : "") + (midpointOf(r.estimate) - r.labeled).toFixed(2)}
                  </span>
                </div>
              );
            })}
            <div className="ac-key rl-label">
              <span>
                <i className="ac-key-gemini" /> Gemini alone
              </span>
              <span>
                <i className="ac-key-rally" /> Rally
              </span>
              <span>
                <i className="ac-key-label" /> Uploader&apos;s label
              </span>
            </div>
          </div>
          <p className="rl-note">
            Uploader labels are unverified. Estimates are starting ranges, not official ratings.
          </p>
        </>
      )}
    </main>
  );
}
