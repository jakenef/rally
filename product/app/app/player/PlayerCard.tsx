// AI lane (Jake). The player card: estimated DUPR, athleticism, style and what Gemini saw.
import { rangeLabel } from "@rally/profiles";
import type { Profile } from "@rally/types";

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="pl-bar">
      <span>{label}</span>
      <div className="pl-bar-track" aria-hidden="true">
        <div className="pl-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="rl-num">{pct}</span>
    </div>
  );
}

export function PlayerCard({ profile, title }: { profile: Profile; title?: string }) {
  const e = profile.estimatedDupr;
  return (
    <article className="pl-card" aria-label={title ?? profile.name}>
      <span className="rl-label">{title ?? profile.name}</span>
      {e ? (
        <div className="pl-dupr">
          {rangeLabel(e).replace(" to ", "–")}
          <br />
          <span>estimated DUPR</span>
        </div>
      ) : (
        <div className="pl-dupr">
          {profile.skill.mu.toFixed(2)}
          <br />
          <span>{profile.skillSource === "dupr" ? "DUPR" : "skill"}</span>
        </div>
      )}
      <div className="pl-meta">
        {e ? <span>{e.confidence} confidence</span> : null}
        {profile.athleticism !== undefined ? <span>Athleticism {profile.athleticism}</span> : null}
        <span>Tempo {profile.tempo}</span>
      </div>
      <div className="pl-bars">
        <Bar label="Power" value={profile.style.power} />
        <Bar label="Kitchen" value={profile.style.kitchen} />
        <Bar label="Mobility" value={profile.style.mobility} />
        <Bar label="Ready" value={profile.style.readiness} />
      </div>
      {profile.card ? (
        <>
          <p className="rl-body" style={{ color: "var(--ink)" }}>
            {profile.card.headline}
          </p>
          {profile.card.reasons.length ? (
            <ul className="pl-reasons">
              {profile.card.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <p className="pl-tip">{profile.card.tip}</p>
        </>
      ) : null}
    </article>
  );
}
