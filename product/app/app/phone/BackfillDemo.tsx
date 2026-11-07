"use client";

import { useState } from "react";
import { createBackfill } from "@rally/backfill";
import { assign } from "@rally/matching";
import { createSessions } from "@rally/sessions";
import { profilesById, roster, tonight } from "@rally/fixtures";
import { Button, Headline, Logo } from "@rally/ui";
import "./phone.css";

const profiles = profilesById();
const name = (id: string) => profiles.get(id)?.name ?? id;
const dollars = (cents: number) => `$${(cents / 100).toFixed(0)}`;

function makeDemo() {
  const sessions = createSessions({ sessions: [tonight] });
  const backfill = createBackfill(sessions);
  const courts = assign(roster.filter(p => tonight.signups.includes(p.playerId)), tonight.courts, { seed: 42 }).courts;
  backfill.registerAssignment(tonight.id, courts, profiles);
  return backfill;
}

/** A local, resettable scene 3 demo. Full dashboard wiring is step 1.4. */
export default function BackfillDemo() {
  const [demo, setDemo] = useState(makeDemo);
  const [state, setState] = useState(() => demo.getState(tonight.id));
  const [leaving, setLeaving] = useState("p08");
  const [status, setStatus] = useState("Choose a player to cancel. Rally will find the best fit on the waitlist.");
  const pending = state.pendingOffer;
  const finished = state.recoveredRevenueCents > 0;

  function cancel() {
    const offer = demo.cancel(tonight.id, leaving);
    setState(demo.getState(tonight.id));
    setStatus(offer ? `${name(leaving)} cancelled. Offering the spot to ${name(offer.playerId)}` : "No eligible waitlisted players. The spot stays open.");
  }

  function reply(answer: "yes" | "no") {
    if (!pending) return;
    demo.reply(pending.offerId, answer);
    const next = demo.getState(tonight.id);
    setState(next);
    setStatus(answer === "yes" ? `${name(pending.playerId)} accepted. The court is full again.`
      : next.pendingOffer ? `${name(pending.playerId)} declined. Offering the spot to ${name(next.pendingOffer.playerId)}`
      : "Everyone declined. The spot stays open.");
  }

  function reset() {
    const fresh = makeDemo();
    setDemo(fresh);
    setState(fresh.getState(tonight.id));
    setStatus("Choose a player to cancel. Rally will find the best fit on the waitlist.");
  }

  return (
    <main className="rl-page">
      <div className="bf-heading">
        <Headline size="h1">Offers</Headline>
      </div>
      <div className="bf-layout">
        <section className="bf-controls" aria-label="Cancellation controls">
          <h2 className="rl-label">Tonight&apos;s session</h2>
          <div className="rl-row">
            <div className="rl-tile"><span className="rl-label">Players</span><strong className="bf-number">{state.session.signups.length} / {tonight.signups.length}</strong></div>
            <div className="rl-tile"><span className="rl-label">Recovered</span><strong className="bf-number">{dollars(state.recoveredRevenueCents)}</strong></div>
          </div>
          <label className="rl-label" htmlFor="cancel-player">Cancel a player</label>
          <select id="cancel-player" value={leaving} onChange={event => setLeaving(event.target.value)} disabled={!!state.vacancy || finished}>
            {tonight.signups.map(id => <option key={id} value={id}>{name(id)}</option>)}
          </select>
          <div className="rl-row">
            <Button variant="outline" onClick={cancel} disabled={!!state.vacancy || finished}>Cancel player</Button>
            <Button variant="light" onClick={reset}>Reset demo</Button>
          </div>
          <p className="rl-body" role="status">{status}</p>
          <h2 className="rl-label">{state.vacancy ? "Ranked replacements" : "Waitlist"}</h2>
          {state.vacancy ? state.vacancy.ranked.map((candidate, i) => (
            <div className="bf-candidate" key={candidate.playerId}>
              <span>{i + 1}. {name(candidate.playerId)}</span>
              <span className="rl-num">{candidate.fairnessAfter.toFixed(1)} fairness · {i < state.vacancy!.next ? "Declined" : pending?.playerId === candidate.playerId ? "Offered" : "Waiting"}</span>
            </div>
          )) : state.session.waitlist.map(id => <p key={id} className="rl-body">{name(id)} · skill {profiles.get(id)!.skill.mu.toFixed(1)}</p>)}
        </section>
        <section className="rl-phone ch-night bf-phone" aria-label="Fake phone">
          <div className="rl-phone-screen">
            <Logo size="sm" />
            {pending ? <>
              <h2 className="bf-phone-title">Your next game.</h2>
              <p className="rl-label">For {name(pending.playerId)}</p>
              <p className="rl-body">{pending.message}</p>
              <Button onClick={() => reply("yes")}>Accept spot</Button>
              <Button variant="outline" onClick={() => reply("no")}>Decline spot</Button>
            </> : <>
              <h2 className="bf-phone-title">{finished ? "You’re on court." : "Stay ready."}</h2>
              <p className="rl-body">{finished ? "Spot accepted. Your game is ready." : state.vacancy ? "No offers left. The court has an open spot." : "Your next offer will appear here."}</p>
            </>}
          </div>
        </section>
      </div>
      <section className="rl-grid" aria-label="Current courts">
        {state.courts.map(court => <div className="rl-tile" key={court.court}>
          <h3>Court {court.court}</h3>
          <span className="rl-label">{state.vacancy?.court === court.court ? "Waiting for replacement" : `Fairness ${court.fairness.toFixed(1)}`}</span>
          {court.teams.map((team, i) => <p className="rl-body" key={i}>Team {i + 1}: {team.map(id => state.vacancy?.leaving === id ? "Open spot" : name(id)).join(" + ")}</p>)}
        </div>)}
      </section>
    </main>
  );
}
