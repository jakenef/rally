# 030: Matching

Status: Draft
Prefix: `MATCH`
Step: 1.1

## Purpose

Given the players in a session and the number of courts, picks which four players go on each court and how they split into two teams, so games are even and fun. This is the part of Rally that's ours: it has to be good and it has to be visible.

## Non-goals

- Rotations across a whole evening (one round at a time is enough).
- Singles.

## Interface

```ts
type Court = {
  court: number;
  teams: [[string, string], [string, string]];  // playerIds
  fairness: number;                              // 0..100
  why: string[];                                 // short reasons, for the dashboard
};
function assign(players: Profile[], courts: number, opts?: { seed?: number }): {
  courts: Court[];
  benched: string[];
};
function fairness(teams: Court["teams"], profiles: Map<string, Profile>): number;
function randomAssign(players: Profile[], courts: number, seed: number): Court[];  // the "chaos" baseline
function ratingOnlyAssign(players: Profile[], courts: number): Court[];         // balances skill only, for scene 4
```

## Behavior

Fairness of a court combines three parts (why: `research/play-styles.md`):
- **Team balance:** gap between the two teams' summed skill. Biggest weight.
- **Court spread:** gap between the best and worst player on the court.
- **Mirror rule:** both teams should have the same style mix. Compare the teams' summed `power` (and `kitchen`): the bigger the gap, the bigger the penalty. Two bangers against two dinkers is the worst case. One banger and one dinker per side, or four of the same style, both score well. The rule doesn't prefer complementary or similar partners, because the evidence doesn't settle that.

Tempo (020) is not part of the score. It's a constraint on who shares a court: a `soft` player and a `fast` player aren't put on the same court when another valid assignment exists. `any` goes anywhere.

Search: start from players sorted by skill, then improve by swapping players between courts and partners (local search) for a fixed number of iterations. 16 players and 4 courts must finish in under 200 ms.

## Acceptance criteria

- **MATCH-1** Given 16 players and 4 courts, every player is on exactly one court and nobody is benched.
- **MATCH-2** Given 18 players and 4 courts, two are benched, chosen as the players with the fewest games tonight (ties: random with seed).
- **MATCH-3** The average fairness of `assign` beats `randomAssign` on the demo roster by at least 30 points.
- **MATCH-4** Given four players with equal skill, two high-power and two low-power, the court with the two high-power players on the same team scores at least 30 points lower than the court with one of each per team.
- **MATCH-7** Given enough players to fill courts by tempo, no court has both a `soft` and a `fast` player. When it can't be avoided, `why` says so.
- **MATCH-5** The same input and seed always gives the same output.
- **MATCH-6** 16 players and 4 courts finish in under 200 ms.

## Open questions

- Exact weights? **Default:** balance 0.55, spread 0.2, mirror 0.25; tune on the demo roster so the scene 4 court scores about 52 rating-only and about 90 mirrored, and write the values in DECISIONS.
- Should partner style be learned from results? **Default:** not at the hackathon; with game history (060), partner pairings that win and get rebooked could add a learned bonus.
