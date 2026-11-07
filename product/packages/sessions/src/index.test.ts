import { describe, expect, it } from "vitest";
import type { Profile, Session } from "@rally/types";
import { fakeClaude } from "../../fakes/src";
import { roster, tonight } from "../../../fixtures";
import { createSessions } from "./index";

const session = (changes: Partial<Session> = {}): Session => ({
  id: "tuesday", facilityId: "rally", startsAt: "2026-11-10T19:00:00-07:00",
  courts: 1, priceCents: 1200, signups: [], waitlist: [], paid: [], ...changes,
});
const player = (id: string, mu = 3.5): Profile => ({ ...roster[0], playerId: id, skill: { mu, sigma: 0.5 } });

describe("sessions", () => {
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

  it("SESS-3 parses Tuesday 7pm, 3.5+, $12 through the fake model as an unsaved preview", async () => {
    const claude = fakeClaude([{
      startsAt: "2026-11-10T19:00:00-07:00", minSkill: 3.5, priceCents: 1200, maxSkill: null, courts: null,
    }]);
    const original = session({ priceCents: 800 });
    const store = createSessions({ sessions: [original], claude, now: () => new Date("2026-11-06T18:00:00Z") });
    const draft = await store.parseRule("Tuesday 7pm is 3.5+ only, $12");
    expect(draft).toEqual({ startsAt: "2026-11-10T19:00:00-07:00", minSkill: 3.5, priceCents: 1200 });
    expect(new Date(draft.startsAt!).getUTCDay()).toBe(3); // Wednesday UTC = Tuesday evening in Utah.
    expect(claude.calls).toHaveLength(1);
    expect(claude.calls[0].shape).toBe("SessionRule");
    expect(claude.calls[0].prompt).toContain("2026-11-06T18:00:00.000Z");
    expect(claude.calls[0].prompt).toContain("America/Denver");
    expect(claude.calls[0].prompt).toContain("Tuesday 7pm is 3.5+ only, $12");
    expect(store.getSession("tuesday")).toEqual(original);
    const approved = store.approveRule("tuesday", draft);
    expect(approved).toEqual({ ...original, ...draft });
    expect(store.signUp("tuesday", player("low", 3))).toMatchObject({ status: "rejected" });
  });

  it("SESS-3 applies a partial rule without wiping existing settings or the roster", async () => {
    const store = createSessions({
      sessions: [session({ minSkill: 3.5, signups: ["a"], paid: ["a"] })],
      claude: fakeClaude([{ priceCents: 1500, startsAt: null, minSkill: null, maxSkill: null, courts: null }]),
    });
    store.approveRule("tuesday", await store.parseRule("Make it $15"));
    expect(store.getSession("tuesday")).toEqual(session({ priceCents: 1500, minSkill: 3.5, signups: ["a"], paid: ["a"] }));
  });

  it("SESS-3 does not let model output replace IDs, sign-ups or payments", async () => {
    const store = createSessions({ sessions: [session()], claude: fakeClaude([{ id: "other", paid: ["intruder"], signups: ["intruder"], priceCents: 0 }]) });
    const draft = await store.parseRule("Free tonight");
    expect(draft).toEqual({ priceCents: 0 });
    expect(store.approveRule("tuesday", draft)).toEqual(session({ priceCents: 0 }));
  });

  it.each([
    { priceCents: -1 }, { priceCents: 12.5 }, { minSkill: 7 }, { minSkill: 4, maxSkill: 3.5 },
    { startsAt: "Tuesday 7pm" }, { courts: 0 },
  ])("SESS-3 rejects an invalid parsed draft %j before saving", async (bad) => {
    const original = session();
    const store = createSessions({ sessions: [original], claude: fakeClaude([bad]) });
    await expect(store.parseRule("Change the rule")).rejects.toThrow();
    expect(store.getSession("tuesday")).toEqual(original);
  });

  it("SESS-3 keeps the existing rule if an approved edit conflicts with it", () => {
    const original = session({ minSkill: 3.5, maxSkill: 4, signups: ["a", "b", "c", "d"], courts: 2 });
    const store = createSessions({ sessions: [original] });
    expect(() => store.approveRule("tuesday", { minSkill: 4.5 })).toThrow("minSkill cannot exceed maxSkill");
    expect(store.getSession("tuesday")).toEqual(original);
  });

  it("SESS-1 cannot remove capacity occupied by existing sign-ups", () => {
    const store = createSessions({ sessions: [session({ courts: 2, signups: ["a", "b", "c", "d", "e"] })] });
    expect(() => store.approveRule("tuesday", { courts: 1 })).toThrow("Cannot reduce courts");
    expect(store.getSession("tuesday").courts).toBe(2);
  });
});
