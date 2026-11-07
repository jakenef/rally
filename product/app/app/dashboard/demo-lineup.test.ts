import { expect, it } from "vitest";
import { roster, tonight } from "@rally/fixtures";
import { assign, primaryStyle, randomAssign } from "@rally/matching";
import { sessionDemoPlayers } from "./demo-lineup";

const stars = (rating: number) => Math.max(1, Math.min(5, Math.round(rating - 1)));
const byId = new Map(sessionDemoPlayers.map(player => [player.playerId, player]));

it("MATCH-1 mixes the one- and five-star demo players before Rally", () => {
  const initial = randomAssign(sessionDemoPlayers, tonight.courts, 42);
  const groups = initial.map(court => court.teams.flat().map(id => stars(byId.get(id)!.skill.mu)));
  expect(groups.every(group => new Set(group).size > 1)).toBe(true);
  expect(groups.some(group => group.includes(1) && group.includes(5))).toBe(true);
});

it("MATCH-4 rallies into full one- and five-star courts with matching icons", () => {
  const result = assign(sessionDemoPlayers, tonight.courts, { seed: 42 });
  const bands = result.courts.map(court => court.teams.flat().map(id => stars(byId.get(id)!.skill.mu)));
  expect(bands).toContainEqual([1, 1, 1, 1]);
  expect(bands).toContainEqual([5, 5, 5, 5]);
  for (const court of result.courts) {
    expect(new Set(court.teams.flat().map(id => stars(byId.get(id)!.skill.mu))).size).toBe(1);
    for (const row of [0, 1]) {
      expect(primaryStyle(byId.get(court.teams[0][row])!)).toBe(primaryStyle(byId.get(court.teams[1][row])!));
    }
    const tempos = court.teams.flat().map(id => byId.get(id)!.tempo);
    expect(tempos.includes("soft") && tempos.includes("fast")).toBe(false);
  }
  expect(result.courts.flatMap(court => court.teams.flat()).sort()).toEqual([...tonight.signups].sort());
});

it("MATCH-1 keeps demo changes separate from the source profiles", () => {
  expect(roster.find(player => player.playerId === "p01")!.skill.mu).toBe(4.6);
  for (const player of sessionDemoPlayers) {
    const original = roster.find(p => p.playerId === player.playerId)!;
    expect(player.skill).not.toBe(original.skill);
    expect(player.style).not.toBe(original.style);
  }
});
