import { describe, expect, it } from "vitest";
import { profilesById, roster, sampleStats, scene4Ids, tonight } from "./index";

const inUnit = (n: number) => n >= 0 && n <= 1;

describe("demo roster", () => {
  it("has unique players with valid style, skill and tempo", () => {
    expect(new Set(roster.map((p) => p.playerId)).size).toBe(roster.length);
    for (const p of roster) {
      expect(Object.values(p.style).every(inUnit), p.name).toBe(true);
      expect(p.skill.mu).toBeGreaterThanOrEqual(2);
      expect(p.skill.mu).toBeLessThanOrEqual(6);
      expect(["soft", "fast", "any"]).toContain(p.tempo);
    }
  });

  it("fills tonight's courts exactly and has a waitlist", () => {
    expect(tonight.signups).toHaveLength(tonight.courts * 4);
    expect(tonight.waitlist.length).toBeGreaterThan(0);
    const ids = profilesById();
    for (const id of [...tonight.signups, ...tonight.waitlist]) expect(ids.has(id), id).toBe(true);
  });

  it("scene 4 group has equal skill, two hard hitters and two soft players", () => {
    const g = scene4Ids.map((id) => profilesById().get(id)!);
    const mus = g.map((p) => p.skill.mu);
    expect(Math.max(...mus) - Math.min(...mus)).toBeLessThanOrEqual(0.1);
    expect(g.filter((p) => p.style.power >= 0.7)).toHaveLength(2);
    expect(g.filter((p) => p.style.power <= 0.3)).toHaveLength(2);
  });
});

describe("sample clip stats", () => {
  it("marks exactly one selected player, and only that one has Gemini's assessment", () => {
    expect(sampleStats.players.filter((p) => p.selected)).toHaveLength(1);
    expect(sampleStats.players.filter((p) => p.watched)).toHaveLength(1);
    expect(sampleStats.players.find((p) => p.selected)?.watched).toBeDefined();
  });
});
