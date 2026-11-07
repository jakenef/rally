import { describe, expect, it } from "vitest";
import type { Profile, Session } from "@rally/types";
import { roster, tonight } from "../../../fixtures";
import { createSessions, getSession, signUp } from "./index";

const session = (changes: Partial<Session> = {}): Session => ({
  id: "tuesday", facilityId: "rally", startsAt: "2026-11-10T19:00:00-07:00",
  courts: 1, priceCents: 1200, signups: [], waitlist: [], paid: [], ...changes,
});
const player = (id: string, mu = 3.5): Profile => ({ ...roster[0], playerId: id, skill: { mu, sigma: 0.5 } });

describe("sessions", () => {
  it("SESS-1 lets the player page join the displayed demo session through the default store", () => {
    const newcomer = player("clip-qa-demo");
    expect(signUp(tonight.id, newcomer)).toEqual({ status: "waitlisted" });
    expect(getSession(tonight.id).waitlist).toContain(newcomer.playerId);
  });
  it("SESS-1 fills courts * 4 spots, then waitlists in arrival order without duplicates", () => {
    const store = createSessions({ sessions: [session({ courts: 2 })] });
    for (let i = 0; i < 8; i++) expect(store.signUp("tuesday", player(`p${i}`)).status).toBe("joined");
    expect(store.signUp("tuesday", player("w1")).status).toBe("waitlisted");
    expect(store.signUp("tuesday", player("w2")).status).toBe("waitlisted");
    expect(store.signUp("tuesday", player("w1")).status).toBe("waitlisted");
    expect(store.signUp("tuesday", player("p0")).status).toBe("joined");
    expect(store.getSession("tuesday").signups).toHaveLength(8);
    expect(store.getSession("tuesday").waitlist).toEqual(["w1", "w2"]);
  });

  it("SESS-1 supports the demo fixture without mutating it or exposing stored arrays", () => {
    const before = structuredClone(tonight);
    const store = createSessions({ sessions: [tonight] });
    expect(store.signUp(tonight.id, player("new-player")).status).toBe("waitlisted");
    const snapshot = store.getSession(tonight.id);
    snapshot.signups.length = 0;
    expect(store.getSession(tonight.id).signups).toEqual(before.signups);
    expect(tonight).toEqual(before);
    const other = createSessions({ sessions: [session()] });
    expect(other.getSession("tuesday").waitlist).toEqual([]);
  });

  it("SESS-2 rejects a below-minimum player with the rule named, even when full", () => {
    const store = createSessions({ sessions: [session({ minSkill: 3.5, signups: ["a", "b", "c", "d"] })] });
    const result = store.signUp("tuesday", player("low", 3.4));
    expect(result.status).toBe("rejected");
    expect(result.reason).toContain("minSkill 3.5+");
    expect(store.getSession("tuesday").waitlist).toEqual([]);
  });

  it("SESS-2 enforces inclusive min/max against mu, not the uncertainty range", () => {
    const store = createSessions({ sessions: [session({ minSkill: 3.5, maxSkill: 4 })] });
    expect(store.signUp("tuesday", player("min", 3.5)).status).toBe("joined");
    expect(store.signUp("tuesday", player("max", 4)).status).toBe("joined");
    expect(store.signUp("tuesday", player("high", 4.1))).toEqual({
      status: "rejected", reason: "This session requires maxSkill 4 or below; your rating is 4.1.",
    });
  });

});
