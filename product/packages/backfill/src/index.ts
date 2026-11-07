// 050 backfill — Facility lane, demo-only cancellation and best-fit offers.
import type { Court, Offer, OfferReply, Profile, RankedCandidate, Session } from "@rally/types";
import { assign, fairness } from "@rally/matching";
import * as defaultSessions from "@rally/sessions";
import type { SessionStore } from "@rally/sessions";

function swapped(teams: Court["teams"], leaving: string, replacement: string): Court["teams"] {
  return teams.map(team => team.map(id => id === leaving ? replacement : id)) as Court["teams"];
}

function profileFor(id: string, profiles: Map<string, Profile>): Profile {
  const profile = profiles.get(id);
  if (!profile) throw new Error(`Missing profile: ${id}`);
  return profile;
}

/** Pass the displayed courts so ranking uses the exact vacant seat, without reshuffling. */
export function rankWaitlist(session: Session, leaving: string, profiles: Map<string, Profile>, courts?: Court[]): RankedCandidate[] {
  const assigned = courts ?? assign(session.signups.map(id => profileFor(id, profiles)), session.courts).courts;
  const court = assigned.find(c => c.teams.flat().includes(leaving));
  if (!court) throw new Error("Cancelling player is not on an assigned court");
  return [...new Set(session.waitlist)]
    .filter(id => id !== leaving && !session.signups.includes(id))
    .filter(id => {
      const { skill } = profileFor(id, profiles);
      return (session.minSkill === undefined || skill.mu >= session.minSkill)
        && (session.maxSkill === undefined || skill.mu <= session.maxSkill);
    })
    .map(playerId => ({ playerId, fairnessAfter: fairness(swapped(court.teams, leaving, playerId), profiles) }))
    .sort((a, b) => b.fairnessAfter - a.fairnessAfter); // Stable ties keep waitlist order.
}

type Vacancy = { leaving: string; court: number; ranked: RankedCandidate[]; next: number };
type State = {
  courts: Court[];
  profiles: Map<string, Profile>;
  vacancy: Vacancy | null;
  pendingOffer: Offer | null;
  recoveredRevenueCents: number;
};

/** Share the Sessions store with the dashboard/player screen. No second copy of sign-ups. */
export function createBackfill(sessions: SessionStore = defaultSessions, options: { timeZone?: string } = {}) {
  const states = new Map<string, State>();
  const responses = new Map<string, OfferReply>();
  let offerSequence = 0;

  function stateFor(sessionId: string): State {
    const state = states.get(sessionId);
    if (!state) throw new Error(`Register the court assignment for session: ${sessionId}`);
    return state;
  }

  function registerAssignment(sessionId: string, courts: Court[], profiles: Map<string, Profile>): void {
    if (states.has(sessionId)) throw new Error("Assignment already registered; create a fresh store to reset the demo");
    const session = sessions.getSession(sessionId);
    const ids = courts.flatMap(c => c.teams.flat());
    if (ids.length !== session.signups.length || new Set(ids).size !== ids.length || ids.some(id => !session.signups.includes(id))) {
      throw new Error("Court assignment must contain each signed-up player once");
    }
    states.set(sessionId, { courts: structuredClone(courts), profiles: structuredClone(profiles), vacancy: null, pendingOffer: null, recoveredRevenueCents: 0 });
  }

  function getState(sessionId: string) {
    const { profiles: _, ...state } = stateFor(sessionId);
    return structuredClone({ ...state, session: sessions.getSession(sessionId) });
  }

  function offer(sessionId: string, playerId: string): Offer {
    const state = stateFor(sessionId);
    const vacancy = state.vacancy;
    if (!vacancy) throw new Error("No cancellation to fill");
    if (state.pendingOffer) {
      if (state.pendingOffer.playerId === playerId) return structuredClone(state.pendingOffer);
      throw new Error("An offer is already pending");
    }
    if (vacancy.ranked[vacancy.next]?.playerId !== playerId) throw new Error("Offer must go to the next best-fit candidate");
    const session = sessions.getSession(sessionId);
    const time = new Intl.DateTimeFormat("en-US", {
      weekday: "long", hour: "numeric", minute: "2-digit", timeZone: options.timeZone ?? "America/Denver",
    }).format(new Date(session.startsAt));
    const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(session.priceCents / 100);
    const pending: Offer = {
      offerId: `${sessionId}-offer-${++offerSequence}`, sessionId, playerId,
      message: `A spot opened on Court ${vacancy.court} at ${time}, ${price}. Accept or decline?`,
    };
    state.pendingOffer = pending;
    return structuredClone(pending);
  }

  function cancel(sessionId: string, leaving: string): Offer | null {
    const state = stateFor(sessionId);
    if (state.vacancy) throw new Error("Finish the current cancellation before cancelling another player");
    const session = sessions.getSession(sessionId);
    if (!session.signups.includes(leaving)) throw new Error("Player is not signed up for this session");
    const ranked = rankWaitlist(session, leaving, state.profiles, state.courts);
    const court = state.courts.find(c => c.teams.flat().includes(leaving))!;
    sessions.cancelSignUp(sessionId, leaving);
    // Keep the departing ID as a seat marker until acceptance; vacancy tells the UI it is empty.
    state.vacancy = { leaving, court: court.court, ranked, next: 0 };
    return ranked.length ? offer(sessionId, ranked[0].playerId) : null;
  }

  function reply(offerId: string, answer: "yes" | "no"): OfferReply {
    const previous = responses.get(offerId);
    if (previous) return previous; // Repeated clicks cannot fill twice or count revenue twice.
    const entry = [...states].find(([, state]) => state.pendingOffer?.offerId === offerId);
    if (!entry) throw new Error("Unknown or inactive offer");
    const [sessionId, state] = entry;
    const pending = state.pendingOffer!;
    const vacancy = state.vacancy!;
    if (answer === "no") {
      state.pendingOffer = null;
      vacancy.next++;
      responses.set(offerId, "declined");
      const next = vacancy.ranked[vacancy.next];
      if (next) offer(sessionId, next.playerId);
      return "declined";
    }
    const court = state.courts.find(c => c.court === vacancy.court)!;
    const teams = swapped(court.teams, vacancy.leaving, pending.playerId);
    const score = fairness(teams, state.profiles);
    const session = sessions.promoteWaitlisted(sessionId, profileFor(pending.playerId, state.profiles));
    court.teams = teams;
    court.fairness = score;
    court.why = [`${profileFor(pending.playerId, state.profiles).name} filled the cancelled spot.`, `Replacement fairness: ${score.toFixed(2)} / 100.`];
    state.recoveredRevenueCents += session.priceCents;
    state.pendingOffer = null;
    state.vacancy = null;
    responses.set(offerId, "accepted");
    return "accepted";
  }

  return { registerAssignment, getState, cancel, offer, reply };
}

export const { registerAssignment, getState, cancel, offer, reply } = createBackfill();
