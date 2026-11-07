import { describe, expect, it } from "vitest";
import type { Court, Profile } from "@rally/types";
import { roster, tonight, profilesById, scene4Ids } from "../../../fixtures";
import { assign, fairness, randomAssign, ratingOnlyAssign } from "./index";

const players = roster.filter(p => tonight.signups.includes(p.playerId));
const average = (courts: Court[]) => courts.reduce((n, c) => n + c.fairness, 0) / courts.length;
const ids = (courts: Court[]) => courts.flatMap(c => c.teams.flat());
const hasConflict = (c: Court, map: Map<string, Profile>) => {
  const tempos = c.teams.flat().map(id => map.get(id)!.tempo);
  return tempos.includes("soft") && tempos.includes("fast");
};

describe("matching", () => {
  it("MATCH-1 assigns all 16 players once without mutating the roster", () => {
    const before = structuredClone(players);
    const result = assign(players, 4);
    expect(result.courts).toHaveLength(4);
    expect(ids(result.courts).sort()).toEqual(players.map(p => p.playerId).sort());
    expect(result.benched).toEqual([]);
    expect(players).toEqual(before);
    for (const c of result.courts) {
      expect(c.fairness).toBe(fairness(c.teams, profilesById(players)));
      expect(c.why.length).toBeGreaterThan(0);
    }
  });
  it("MATCH-3 improves average fairness over random on the demo roster", () => {
    const optimized = average(assign(players, 4, { seed: 42 }).courts);
    const baseline = average(randomAssign(players, 4, 42));
    expect(optimized - baseline).toBeGreaterThanOrEqual(30);
  });
  it("MATCH-4 penalizes equal-skill bangers against dinkers by at least 30", () => {
    const map = profilesById(scene4Ids.map(id => ({ ...profilesById().get(id)!, skill: { mu: 3.8, sigma: 0.25 } })));
    const bad: Court["teams"] = [["p05", "p06"], ["p07", "p08"]];
    const good: Court["teams"] = [["p05", "p07"], ["p06", "p08"]];
    expect(fairness(good, map) - fairness(bad, map)).toBeGreaterThanOrEqual(30);
    // Four players of one style are also a valid mirrored matchup.
    const same = new Map([...map].map(([id, p]) => [id, { ...p, style: { ...p.style, power: 0.8, kitchen: 0.5 } }]));
    expect(fairness(bad, same)).toBe(100);
  });
  it("MATCH-5 repeats assignments and baselines with a fixed seed", () => {
    expect(assign(players, 4, { seed: 7 })).toEqual(assign(players, 4, { seed: 7 }));
    expect(randomAssign(players, 4, 7)).toEqual(randomAssign(players, 4, 7));
  });
  it("MATCH-6 assigns four courts in under 200 ms", () => {
    assign(players, 4); // warm up
    const start = performance.now();
    assign(players, 4, { seed: 42 });
    expect(performance.now() - start).toBeLessThan(200);
  });
  it("MATCH-7 respects tempo when a conflict-free grouping exists", () => {
    for (let seed = 0; seed < 10; seed++) {
      expect(assign(players, 4, { seed }).courts.some(c => hasConflict(c, profilesById(players)))).toBe(false);
    }
  });
  it("MATCH-7 explains unavoidable soft/fast conflicts", () => {
    const mixed = players.slice(0, 4).map((p, i): Profile => ({ ...p, tempo: i === 0 ? "soft" : "fast" }));
    const c = assign(mixed, 1).courts[0];
    expect(hasConflict(c, profilesById(mixed))).toBe(true);
    expect(c.why.join(" ")).toContain("Tempo conflict");
  });
  it("MATCH-4 exposes a rating-only comparison using the same fairness measure", () => {
    const group = scene4Ids.map(id => profilesById().get(id)!);
    const baseline = ratingOnlyAssign(group, 1)[0];
    const optimized = assign(group, 1).courts[0];
    expect(optimized.fairness).toBeGreaterThan(baseline.fairness);
    expect(ids([baseline]).sort()).toEqual([...scene4Ids].sort());
  });
  it("MATCH-1 handles another full court count and rejects incomplete groups", () => {
    expect(assign(players.slice(0, 8), 2).courts).toHaveLength(2);
    expect(() => assign(players.slice(0, 6), 2)).toThrow("full groups of four");
    expect(() => assign(players, 3)).toThrow("enough courts");
  });
});
