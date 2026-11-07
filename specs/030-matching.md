# 030: Matching

Status: Draft
Prefix: `MATCH`
Step: 1.2

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
```

## Behavior

Fairness of a court combines:
- **Team balance:** gap between the two teams' summed skill (biggest weight).
- **Court spread:** gap between the best and worst player on the court.
- **Style fit:** penalty when one team is two high-power players and the other two low-power players; small bonus for mixed pairs.

Search: start from players sorted by skill, then improve by swapping players between courts and partners (local search) for a fixed number of iterations. 16 players and 4 courts must finish in under 200 ms.

## Acceptance criteria

- **MATCH-1** Given 16 players and 4 courts, every player is on exactly one court and nobody is benched.
- **MATCH-2** Given 18 players and 4 courts, two are benched, chosen as the players with the fewest games tonight (ties: random with seed).
- **MATCH-3** The average fairness of `assign` beats `randomAssign` on the demo roster by at least 30 points.
- **MATCH-4** Two courts with the same average skill but different style mixes get different fairness scores.
- **MATCH-5** The same input and seed always gives the same output.
- **MATCH-6** 16 players and 4 courts finish in under 200 ms.

## Open questions

- Exact weights? **Default:** balance 0.6, spread 0.25, style 0.15; tune on the demo roster and write the values in DECISIONS.
