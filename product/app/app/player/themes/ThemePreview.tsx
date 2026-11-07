"use client";

import { useState } from "react";
import { Button, Icon, type IconName } from "@rally/ui";
import "./themes.css";

export const directions = {
  courtline: { number: "01", name: "Courtline", description: "Athletic. Condensed. Built for game night.", type: "Mona Sans + Barlow Condensed", headline: <>GOOD GAMES.<br /><em>GREAT NIGHTS.</em></> },
  matchpoint: { number: "02", name: "Matchpoint", description: "Clean. Geometric. Confidently understated.", type: "Mona Sans + Space Grotesk", headline: <>Make room for<br /><em>better games.</em></> },
  baseline: { number: "03", name: "Baseline", description: "Precise. Technical. All signal.", type: "Mona Sans + IBM Plex Mono", headline: <>THE RIGHT FOUR.<br /><em>EVERY COURT.</em></> },
  overtime: { number: "04", name: "Overtime", description: "Oversized. Editorial. Exclusively pickleball.", type: "Anton + Mona Sans", headline: <>BUILT FOR<br /><em>THE RALLY.</em></> },
};
export type Direction = keyof typeof directions;
type Screen = "session" | "players";
const roster = [
  { name: "Alex Morgan", initials: "AM", rating: "4.0", style: "Dinker", skill: "3.8–4.2" },
  { name: "Jordan Lee", initials: "JL", rating: "4.1", style: "Banger", skill: "3.9–4.3" },
  { name: "Sam Rivera", initials: "SR", rating: "4.0", style: "Dinker", skill: "3.8–4.2" },
  { name: "Taylor Brooks", initials: "TB", rating: "4.2", style: "Banger", skill: "4.0–4.4" },
];

function Court({ number, score, balanced }: { number: number; score: number; balanced: boolean }) {
  const players = number % 2 ? roster : [...roster].reverse();
  return <article className="tp-court">
    <header><span className="tp-eyebrow">Court / 0{number}</span><span className="tp-score">{balanced ? score : score - 25}<small>/100 FAIRNESS</small></span></header>
    <div className="tp-court-map" aria-label={`Court ${number} team assignment`}>
      <div className="tp-court-net" /><div className="tp-kitchen" />
      {players.map((p, i) => <span className={`tp-player-dot tp-pos-${i}`} key={p.name}><b>{p.initials}</b><small>{p.rating}</small></span>)}
      <span className="tp-vs">VS</span>
    </div>
    <div className="tp-teams"><span>{players[0].name.split(" ")[0]} + {players[1].name.split(" ")[0]}</span><span>{players[2].name.split(" ")[0]} + {players[3].name.split(" ")[0]}</span></div>
    <footer><span className="tp-status-dot" />{balanced ? "Style mirrored · skill balanced" : "Unbalanced · ready to rally"}</footer>
  </article>;
}

export function ThemePreview({ direction }: { direction: Direction }) {
  const theme = directions[direction];
  const [screen, setScreen] = useState<Screen>("session");
  const [balanced, setBalanced] = useState(false);
  const [selected, setSelected] = useState(0);
  const [backfilled, setBackfilled] = useState(false);
  const [joined, setJoined] = useState(false);
  const player = roster[selected];
  const navItems: { screen: Screen; label: string; icon: IconName; index: string }[] = [
    { screen: "session", label: "Tonight's session", icon: "court", index: "01" },
    { screen: "players", label: "Player profiles", icon: "paddle", index: "02" },
  ];

  return <div className={`tp-root tp-${direction}`}>
    <div className="tp-review-bar">
      <a href="/player/themes" className="tp-review-label">RALLY <span>/ DESIGN STUDY</span></a>
      <nav aria-label="Design directions">{(Object.keys(directions) as Direction[]).map((key) => <a key={key} href={`/player/themes/${key}`} aria-current={key === direction ? "page" : undefined}><span>{directions[key].number}</span> {directions[key].name}</a>)}</nav>
      <span className="tp-preview-tag">Interactive preview · sample data</span>
    </div>

    <div className="tp-shell">
      <aside className="tp-sidebar">
        <a className="tp-brand" href={`/player/themes/${direction}`} aria-label="Rally preview home"><span className="tp-brand-mark"><Icon name="ball" size={25} /></span>RALLY<span className="tp-brand-period">.</span></a>
        <div className="tp-facility"><span className="tp-facility-icon"><Icon name="court" size={20} /></span><div>Provo Pickleball Club<small>FACILITY WORKSPACE</small></div></div>
        <div className="tp-nav-label tp-eyebrow">THE CLUBHOUSE</div>
        <nav className="tp-app-nav" aria-label="Preview screens">{navItems.map((item) => <button key={item.screen} aria-label={item.label} aria-pressed={screen === item.screen} onClick={() => setScreen(item.screen)}><Icon name={item.icon} size={20} /><span>{item.label}</span><small aria-hidden="true">{item.index}</small></button>)}</nav>
        <div className="tp-sidebar-bottom"><div className="tp-night-note"><Icon name="ball" size={26} /><p>LESS ADMIN.<br /><b>MORE RALLY.</b></p></div><div className="tp-user"><span className="tp-avatar">JD</span><div>Jamie Davis<small>Club manager</small></div><span className="tp-user-arrow">↗</span></div></div>
      </aside>

      <div className="tp-workspace">
        <header className="tp-topbar"><span>WORKSPACE <span className="tp-slash">/</span> <b>{screen === "session" ? "OVERVIEW" : "PLAYERS"}</b></span><div><span className="tp-status-dot" /><span>FRIDAY, NOV 06</span><span className="tp-avatar tp-avatar-small">JD</span></div></header>
        <main className="tp-main">
          <div className="tp-heading-row"><div><div className="tp-eyebrow tp-kicker"><span />PROVO, UTAH / GAME NIGHT</div><h1>{screen === "session" ? theme.headline : <>KNOW YOUR<br /><em>NEXT PARTNER.</em></>}</h1><p>{screen === "session" ? "Balanced courts. Better partners. A full house." : "Same rating. Different game. Find the player behind the number."}</p></div><div className="tp-heading-action">{direction === "overtime" ? <div className="tp-hero-emblem" aria-hidden="true"><Icon name="ball" size={180} /><span>[ ALWAYS IN PLAY ]</span></div> : null}<span className="tp-eyebrow">{screen === "session" ? "TUESDAY OPEN PLAY" : "THE PLAYER LAB"}</span><Button onClick={() => screen === "session" ? setBalanced(!balanced) : setJoined(!joined)} iconAfter="arrow">{screen === "session" ? balanced ? "Reset assignments" : "Rally the courts" : joined ? "Leave session" : "Join the session"}</Button></div></div>

          {screen === "session" ? <>
            <section className="tp-metrics" aria-label="Session metrics">{[
              ["PLAYERS CHECKED IN", backfilled ? "16" : "15", "/ 16", backfilled ? "The house is full" : "One spot to fill"],
              ["COURTS IN PLAY", "04", "", "Doubles · games to 11"],
              ["AVG. FAIRNESS", balanced ? "94" : "69", "/ 100", balanced ? "+25 after balancing" : "Ready for a better match"],
              ["SESSION REVENUE", backfilled ? "$384" : "$360", "", backfilled ? "$24 recovered from waitlist" : "$24 available to recover"],
            ].map(([label, value, unit, note]) => <article key={label}><span className="tp-eyebrow">{label}</span><strong>{value}<small>{unit}</small></strong><span className="tp-metric-note">{note}</span></article>)}</section>

            <div className="tp-content-grid"><section className="tp-courts-section"><div className="tp-section-title"><h2>Tonight&apos;s lineup<span>04 COURTS</span></h2><span className="tp-live"><i />7:00–9:00 PM</span></div><div className="tp-courts"><Court number={1} score={96} balanced={balanced} /><Court number={2} score={92} balanced={balanced} /></div><div className="tp-more-courts"><Icon name="court" size={18} /><span>Courts 03 &amp; 04</span><b>{balanced ? "Balanced and ready" : "Awaiting assignments"}</b></div></section>
              <aside className="tp-right-column"><article className="tp-reel"><img src="/theme-options/rec-play.jpg" alt="Doubles pickleball players during a rally" /><div className="tp-reel-shade" /><span className="tp-eyebrow tp-reel-label">THE PLAYER LAB</span><div className="tp-reel-copy"><h2>FROM CLIP.<br />TO COURT.</h2><button onClick={() => setScreen("players")}>Explore player profiles <Icon name="arrow" size={19} /></button></div><a className="tp-photo-credit" href="https://www.youtube.com/watch?v=f5WajWaVLfM" target="_blank" rel="noreferrer">Footage: RallyPoint / Suffolk Pickleball Co.</a></article>
              <article className="tp-backfill"><div className="tp-eyebrow"><Icon name="ball" size={17} /> KEEP THE COURT FULL</div><h3>{backfilled ? "Spot filled. Game on." : "Someone bailed. We got it."}</h3><p>{backfilled ? "Casey accepted the offer. Four courts, sixteen players, zero loose ends." : "Casey is next on the waitlist. A 4.0 dinker, ready to step in."}</p><button onClick={() => setBackfilled(!backfilled)}>{backfilled ? "Reset the demo" : "Fill the open spot"}<Icon name="arrow" size={19} /></button></article></aside>
            </div>
          </> : <div className="tp-player-layout">
            <section className="tp-roster"><div className="tp-section-title"><h2>The roster<span>04 PLAYERS</span></h2></div>{roster.map((p, i) => <button aria-pressed={selected === i} onClick={() => { setSelected(i); setJoined(false); }} key={p.name}><span className="tp-avatar">{p.initials}</span><span><b>{p.name}</b><small>{p.style} · estimated {p.rating}</small></span><Icon name="arrow" size={19} /></button>)}</section>
            <article className="tp-profile"><div className="tp-profile-head"><span className="tp-eyebrow">PLAYER CARD / {String(selected + 1).padStart(2, "0")}</span><Icon name="paddle" size={26} /></div><div className="tp-profile-identity"><span className="tp-avatar">{player.initials}</span><div><h2>{player.name}</h2><span className="tp-style-tag">{player.style} / controlled tempo</span></div></div><div className="tp-rating"><div><span className="tp-eyebrow">ESTIMATED DUPR</span><strong>{player.skill}</strong><p>Video estimate · medium confidence</p></div><div className="tp-athleticism"><span>ATHLETICISM</span><b>78<small>/100</small></b></div></div><p className="tp-scout-note">{player.style === "Dinker" ? "Patient at the kitchen. Builds the point with soft hands and a well-placed third-shot drop." : "Brings pace from the baseline. Looks for the opening, then drives hard to put opponents on the back foot."}</p><div className="tp-style-bars">{[["Soft game", player.style === "Dinker" ? 86 : 42], ["Pace", player.style === "Banger" ? 89 : 52], ["Court coverage", 78]].map(([label, value]) => <div key={label}><span>{label}<b>{value}</b></span><div><i style={{ width: `${value}%` }} /></div></div>)}</div><Button onClick={() => setJoined(!joined)} iconAfter="arrow">{joined ? "Leave session" : "Join Tuesday · $24"}</Button><p className="tp-profile-status" role="status">{joined ? `${player.name} is in. See you on court.` : "4 courts · balanced doubles · 7:00 PM"}</p></article>
          </div>}

          <footer className="tp-page-footer"><span>BUILT FOR THE NEXT RALLY.</span><span>PROVO, 2026 <Icon name="ball" size={14} /></span></footer>
          {direction === "overtime" ? <div className="tp-overtime-signoff"><span>MORE PLAY.<br />LESS FRICTION.</span><Icon name="arrow" size={130} /></div> : null}
          <section className="tp-direction-note" aria-label="Design details"><div><span className="tp-eyebrow">DIRECTION {theme.number}</span><h2>{theme.name}</h2><p>{theme.description}</p>{direction === "overtime" ? <p>Typography reference: <a href="https://www.graphichunters.com/" target="_blank" rel="noreferrer">GraphicHunters ↗</a></p> : null}</div><div><span className="tp-eyebrow">TYPE PAIRING</span><p>{theme.type}</p><div className="tp-swatches"><i /><i /><i /><span>Black foundation. Crimson accents.</span></div></div></section>
        </main>
      </div>
    </div>
  </div>;
}
