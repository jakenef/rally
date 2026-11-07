import { describe, expect, it } from "vitest";
import type { Court, Profile, Session } from "@rally/types";
import { assign, fairness } from "@rally/matching";
import { createSessions } from "@rally/sessions";
import { profilesById, roster, tonight } from "../../../fixtures";
import { createBackfill, rankWaitlist } from "./index";

function setup(waitlist = ["bad", "good"]) {
  const player = (playerId: string, power: number, kitchen: number): Profile => ({
    playerId, name: playerId, style: { power, kitchen, mobility: 0.5, readiness: 0.5 },
    skill: { mu: 3.5, sigma: 0.25 }, skillSource: "dupr", tempo: "any",
  });
  const profiles = new Map([
    player("b1", 0.9, 0.4), player("s1", 0.1, 0.9), player("b2", 0.9, 0.4), player("s2", 0.1, 0.9),
    player("bad", 0.9, 0.4), player("good", 0.1, 0.9), player("tie", 0.1, 0.9),
  ].map(p => [p.playerId, p]));
  const session: Session = {
    id: "tuesday", facilityId: "provo", startsAt: "2026-11-10T19:00:00-07:00", courts: 1, priceCents: 1200,
    signups: ["b1", "s1", "b2", "s2"], waitlist, paid: [],
  };
  const courts: Court[] = [{ court: 2, teams: [["b1", "s1"], ["b2", "s2"]], fairness: 100, why: ["Mirrored teams"] }];
  const sessions = createSessions({ sessions: [session] });
  const backfill = createBackfill(sessions);
  backfill.registerAssignment(session.id, courts, profiles);
  return { profiles, session, courts, sessions, backfill };
}

describe("backfill", () => {
  it("FILL-1 chooses the mirrored-style replacement over the first waitlisted player", () => {
    const { session, courts, profiles } = setup();
    const before = structuredClone({ session, courts, profiles });
    const ranked = rankWaitlist(session, "s1", profiles, courts);
    expect(ranked).toEqual([{ playerId: "good", fairnessAfter: 100 }, { playerId: "bad", fairnessAfter: 67.5 }]);
    expect({ session, courts, profiles }).toEqual(before);
  });

  it("FILL-1 keeps arrival order for equal scores and excludes players outside session skill rules", () => {
    const { session, courts, profiles } = setup(["tie", "good", "bad"]);
    expect(rankWaitlist(session, "s1", profiles, courts).map(p => p.playerId)).toEqual(["tie", "good", "bad"]);
    session.minSkill = 3.5;
    session.maxSkill = 4;
    profiles.get("tie")!.skill.mu = 3;
    profiles.get("bad")!.skill.mu = 4.5;
    expect(rankWaitlist(session, "s1", profiles, courts).map(p => p.playerId)).toEqual(["good"]);
  });

  it("FILL-1 ranks the real demo roster through the matching interface", () => {
    const profiles = profilesById();
    const courts = assign(roster.filter(p => tonight.signups.includes(p.playerId)), tonight.courts).courts;
    const leaving = courts[0].teams[0][0];
    expect(rankWaitlist(tonight, leaving, profiles)).toEqual(rankWaitlist(tonight, leaving, profiles, courts));
    expect(rankWaitlist(tonight, leaving, profiles, courts)).toHaveLength(2);
  });

  it("FILL-2 cancels, offers the best candidate, then offers the next candidate after a decline", () => {
    const { backfill, sessions } = setup();
    const first = backfill.cancel("tuesday", "s1")!;
    expect(first.playerId).toBe("good");
    expect(first.message).toContain("Court 2");
    expect(first.message).toContain("Tuesday");
    expect(first.message).toContain("7:00 PM");
    expect(first.message).toContain("$12");
    expect(sessions.getSession("tuesday").signups).not.toContain("s1");
    expect(backfill.getState("tuesday").recoveredRevenueCents).toBe(0);
    expect(backfill.reply(first.offerId, "no")).toBe("declined");
    const next = backfill.getState("tuesday").pendingOffer!;
    expect(next.playerId).toBe("bad");
    expect(next.offerId).not.toBe(first.offerId);
    expect(backfill.reply(next.offerId, "yes")).toBe("accepted");
    expect(sessions.getSession("tuesday").signups).toContain("bad");
    expect(backfill.getState("tuesday").pendingOffer).toBeNull();
  });

  it("FILL-4 acceptance restores the count, fills the same seat and counts revenue once", () => {
    const { session, courts, backfill, sessions, profiles } = setup();
    const offer = backfill.cancel("tuesday", "s1")!;
    expect(backfill.reply(offer.offerId, "yes")).toBe("accepted");
    expect(backfill.reply(offer.offerId, "yes")).toBe("accepted");
    const state = backfill.getState("tuesday");
    expect(state.session.signups).toHaveLength(session.signups.length);
    expect(state.session.waitlist).toEqual(["bad"]);
    expect(state.session.paid).toEqual([]);
    expect(state.recoveredRevenueCents).toBe(1200);
    expect(state.vacancy).toBeNull();
    expect(state.courts[0].teams).toEqual([["b1", "good"], ["b2", "s2"]]);
    expect(state.courts[0].fairness).toBe(fairness(state.courts[0].teams, profiles));
    expect(sessions.getSession("tuesday")).toEqual(state.session);
    expect(courts[0].teams).toEqual([["b1", "s1"], ["b2", "s2"]]);
  });

  it("FILL-2 allows only one pending offer and a repeated decline cannot skip a candidate", () => {
    const { backfill } = setup();
    const first = backfill.cancel("tuesday", "s1")!;
    expect(backfill.offer("tuesday", first.playerId)).toEqual(first);
    expect(() => backfill.offer("tuesday", "bad")).toThrow("already pending");
    expect(() => backfill.cancel("tuesday", "b1")).toThrow("Finish the current cancellation");
    backfill.reply(first.offerId, "no");
    const next = backfill.getState("tuesday").pendingOffer;
    backfill.reply(first.offerId, "no");
    expect(backfill.getState("tuesday").pendingOffer).toEqual(next);
    expect(backfill.reply(first.offerId, "yes")).toBe("declined");
  });

  it("FILL-2 leaves the vacancy open with no revenue when everyone declines", () => {
    const { backfill } = setup();
    const first = backfill.cancel("tuesday", "s1")!;
    backfill.reply(first.offerId, "no");
    backfill.reply(backfill.getState("tuesday").pendingOffer!.offerId, "no");
    expect(backfill.getState("tuesday")).toMatchObject({ pendingOffer: null, recoveredRevenueCents: 0, session: { signups: ["b1", "b2", "s2"] } });
    expect(backfill.getState("tuesday").vacancy).not.toBeNull();
  });

  it("FILL-2 handles an empty waitlist without fabricating an offer", () => {
    const { backfill } = setup([]);
    expect(backfill.cancel("tuesday", "s1")).toBeNull();
    expect(backfill.getState("tuesday").session.signups).toHaveLength(3);
  });

  it("FILL-4 updates only the affected court on the four-court demo roster", () => {
    const sessions = createSessions({ sessions: [tonight] });
    const courts = assign(roster.filter(p => tonight.signups.includes(p.playerId)), tonight.courts).courts;
    const backfill = createBackfill(sessions);
    backfill.registerAssignment(tonight.id, courts, profilesById());
    const leaving = courts[0].teams[0][0];
    const offer = backfill.cancel(tonight.id, leaving)!;
    backfill.reply(offer.offerId, "yes");
    const state = backfill.getState(tonight.id);
    expect(state.courts.slice(1)).toEqual(courts.slice(1));
    expect(state.session.signups).toHaveLength(16);
    expect(state.session.signups).not.toContain(leaving);
    expect(state.session.signups).toContain(offer.playerId);
    expect(state.recoveredRevenueCents).toBe(tonight.priceCents);
  });
});
