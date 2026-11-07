import { profilesById, roster, tonight } from "@rally/fixtures";
import { Headline } from "@rally/ui";

// Facility lane (Danny). Placeholder from the base layer: lists tonight's players from the fixtures.
// Step 1.4 replaces it with courts, the Rally it button, fairness scores and backfill.
export default function Dashboard() {
  const byId = profilesById(roster);
  const card = (id: string) => {
    const p = byId.get(id)!;
    return (
      <div key={id} className="rl-tile">
        <h3>{p.name}</h3>
        <span className="rl-body rl-num">
          Skill {p.skill.mu.toFixed(2)} · {p.skillSource.toUpperCase()} · {p.tempo}
        </span>
        <span className="rl-body rl-num">
          Power {Math.round(p.style.power * 100)} · Kitchen {Math.round(p.style.kitchen * 100)}
        </span>
      </div>
    );
  };
  return (
    <main className="rl-page">
      <Headline size="h1" parts={["Session", { text: "roster", accent: true }]} />
      <span className="rl-label">
        Signed up · {tonight.signups.length} players · {tonight.courts} courts · ${(tonight.priceCents / 100).toFixed(0)}
      </span>
      <div className="rl-grid">{tonight.signups.map(card)}</div>
      <span className="rl-label">Waitlist</span>
      <div className="rl-grid">{tonight.waitlist.map(card)}</div>
    </main>
  );
}
