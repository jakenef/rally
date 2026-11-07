// 030 matching — Facility lane. One round of full doubles courts.
import type { Assignment, Court, Profile } from "@rally/types";

type Group = [Profile, Profile, Profile, Profile];
const WEIGHTS = { balance: 55, spread: 20, mirror: 25 };
const PAIRS = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]] as const;

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(items: T[], next: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function validate(players: Profile[], courts: number): void {
  if (!Number.isInteger(courts) || courts < 0 || players.length % 4 !== 0 || players.length > courts * 4) {
    throw new Error("Matching currently requires full groups of four and enough courts for everyone.");
  }
  if (new Set(players.map(p => p.playerId)).size !== players.length) {
    throw new Error("Each player must appear only once.");
  }
}
function metrics(g: Group) {
  const [a, b, c, d] = g;
  return {
    balance: Math.abs(a.skill.mu + b.skill.mu - c.skill.mu - d.skill.mu),
    spread: Math.max(...g.map(p => p.skill.mu)) - Math.min(...g.map(p => p.skill.mu)),
    mirror: Math.abs(a.style.power + b.style.power - c.style.power - d.style.power)
      + Math.abs(a.style.kitchen + b.style.kitchen - c.style.kitchen - d.style.kitchen),
  };
}
function score(g: Group): number {
  const m = metrics(g);
  // A 0.8 summed-skill gap, 1.5 court spread, and 1.0 summed-style gap
  // consume their respective budgets. Mirror can consume two budgets so
  // the equal-skill contrast in MATCH-4 remains visible (>=30 points).
  return Math.max(0, Math.min(100, 100
    - WEIGHTS.balance * Math.min(1, m.balance / 0.8)
    - WEIGHTS.spread * Math.min(1, m.spread / 1.5)
    - WEIGHTS.mirror * Math.min(2, m.mirror)));
}
function conflicts(g: Group): number {
  return Number(g.some(p => p.tempo === "soft") && g.some(p => p.tempo === "fast"));
}
/** Same strongest-attribute rule used by the visible player icons. */
export function primaryStyle(p: Profile): keyof Profile["style"] {
  const kinds = ["power", "kitchen", "mobility", "readiness"] as const;
  return kinds.reduce((best, kind) => p.style[kind] > p.style[best] ? kind : best);
}
function iconMismatch(g: Group): number {
  return Number(primaryStyle(g[0]) !== primaryStyle(g[2]))
    + Number(primaryStyle(g[1]) !== primaryStyle(g[3]));
}
function alignOpponents(g: Group): Group {
  const flipped: Group = [g[0], g[1], g[3], g[2]];
  const rowGap = (v: Group) => Math.abs(v[0].skill.mu - v[2].skill.mu) + Math.abs(v[1].skill.mu - v[3].skill.mu);
  return iconMismatch(flipped) < iconMismatch(g)
    || (iconMismatch(flipped) === iconMismatch(g) && rowGap(flipped) < rowGap(g)) ? flipped : g;
}
function bestPartners(g: Group, ratingOnly = false): Group {
  let best = g;
  let bestValue = -Infinity;
  for (const order of PAIRS) {
    const ordered = order.map(i => g[i]) as Group;
    const candidate = ratingOnly ? ordered : alignOpponents(ordered);
    const value = ratingOnly ? -metrics(candidate).balance : score(candidate) - iconMismatch(candidate) * 1000;
    if (value > bestValue) { best = candidate; bestValue = value; }
  }
  return best;
}
function groups(players: Profile[]): Group[] {
  const result: Group[] = [];
  for (let i = 0; i < players.length; i += 4) result.push(players.slice(i, i + 4) as Group);
  return result;
}
function sorted(players: Profile[]): Profile[] {
  return [...players].sort((a, b) => b.skill.mu - a.skill.mu || a.playerId.localeCompare(b.playerId));
}
function initialGroups(players: Profile[]): Group[] {
  const ordered = sorted(players);
  const fast = ordered.filter(p => p.tempo === "fast");
  const soft = ordered.filter(p => p.tempo === "soft");
  const any = ordered.filter(p => p.tempo === "any");
  const fastCourts = Math.ceil(fast.length / 4);
  const softCourts = Math.ceil(soft.length / 4);
  if (fastCourts + softCourts > players.length / 4) return groups(ordered);
  // Fill dedicated tempo groups with flexible players. This guarantees a
  // conflict-free starting point whenever one exists for this full roster.
  const fastFill = any.splice(0, fastCourts * 4 - fast.length);
  const softFill = any.splice(0, softCourts * 4 - soft.length);
  return [...groups(sorted([...fast, ...fastFill])), ...groups(sorted([...soft, ...softFill])), ...groups(any)];
}
function court(g: Group, index: number): Court {
  const m = metrics(g);
  const why = [
    `Team skill gap: ${m.balance.toFixed(2)}.`,
    `Court skill spread: ${m.spread.toFixed(2)}.`,
    `Visible style pairs: ${2 - iconMismatch(g)} / 2.`,
    `Power/kitchen style gap: ${m.mirror.toFixed(2)} (lower is more mirrored).`,
  ];
  why.push(conflicts(g)
    ? "Tempo conflict: soft and fast players share this court; could not avoid it in this assignment."
    : "Tempo preferences compatible.");
  return {
    court: index + 1,
    teams: [[g[0].playerId, g[1].playerId], [g[2].playerId, g[3].playerId]],
    fairness: Math.round(score(g) * 100) / 100,
    why,
  };
}
export function fairness(teams: Court["teams"], profiles: Map<string, Profile>): number {
  const g = teams.flat().map(id => {
    const p = profiles.get(id);
    if (!p) throw new Error(`Missing profile: ${id}`);
    return p;
  }) as Group;
  return Math.round(score(g) * 100) / 100;
}
// Exhaustive partitioning for demo-sized rosters avoids local-search traps.
// Tempo compatibility comes first, exact icon pairs next, then skill/style fairness.
function optimalGroups(players: Profile[]): Group[] {
  const n = players.length;
  const candidates: { mask: number; group: Group; cost: number }[][] = Array.from({ length: n }, () => []);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++)
    for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
      const group = bestPartners([players[a], players[b], players[c], players[d]]);
      candidates[a].push({
        mask: (1 << a) | (1 << b) | (1 << c) | (1 << d), group,
        cost: conflicts(group) * 100000 + iconMismatch(group) * 1000 + 100 - score(group),
      });
    }
  const costs = new Float64Array(1 << n).fill(NaN);
  const choices = new Int32Array(1 << n).fill(-1);
  costs[0] = 0;
  function solve(mask: number): number {
    if (!Number.isNaN(costs[mask])) return costs[mask];
    const first = 31 - Math.clz32(mask & -mask);
    let best = Infinity;
    candidates[first].forEach((candidate, index) => {
      if ((candidate.mask & mask) !== candidate.mask) return;
      const cost = candidate.cost + solve(mask ^ candidate.mask);
      if (cost < best) { best = cost; choices[mask] = index; }
    });
    return costs[mask] = best;
  }
  let remaining = (1 << n) - 1;
  solve(remaining);
  const result: Group[] = [];
  while (remaining) {
    const first = 31 - Math.clz32(remaining & -remaining);
    const candidate = candidates[first][choices[remaining]];
    result.push(candidate.group);
    remaining ^= candidate.mask;
  }
  return result;
}
export function assign(players: Profile[], courts: number, opts?: { seed?: number }): Assignment {
  validate(players, courts);
  if (players.length <= 16) return { courts: optimalGroups(sorted(players)).map(court), benched: [] };
  const next = random(opts?.seed ?? 0);
  const result = initialGroups(players).map(g => bestPartners(g));
  if (result.length > 1) {
    for (let iteration = 0; iteration < 2000; iteration++) {
      const a = Math.floor(next() * result.length);
      let b = Math.floor(next() * (result.length - 1));
      if (b >= a) b++;
      const i = Math.floor(next() * 4), j = Math.floor(next() * 4);
      const ga = [...result[a]] as Group, gb = [...result[b]] as Group;
      [ga[i], gb[j]] = [gb[j], ga[i]];
      const ca = bestPartners(ga), cb = bestPartners(gb);
      const beforeConflicts = conflicts(result[a]) + conflicts(result[b]);
      const afterConflicts = conflicts(ca) + conflicts(cb);
      if (afterConflicts < beforeConflicts || (afterConflicts === beforeConflicts
        && score(ca) + score(cb) > score(result[a]) + score(result[b]) + 1e-9)) {
        result[a] = ca; result[b] = cb;
      }
    }
  }
  return { courts: result.map(court), benched: [] };
}
export function randomAssign(players: Profile[], courts: number, seed: number): Court[] {
  validate(players, courts);
  return groups(shuffled(players, random(seed))).map(court);
}
export function ratingOnlyAssign(players: Profile[], courts: number): Court[] {
  validate(players, courts);
  return groups(sorted(players)).map(g => bestPartners(g, true)).map(court);
}
