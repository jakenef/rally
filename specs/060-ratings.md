# 060: Ratings

Status: Draft
Prefix: `RATE`
Step: 3.1
Lane: Facility (Danny). Only that lane changes this module's code (see `specs/README.md`, Lanes).

## Purpose

Updates players' skill after each game with OpenSkill, so the video estimate stops mattering quickly.

## Non-goals

- Publishing ratings outside the facility.
- Matching DUPR's numbers exactly.

## Interface

```ts
function recordGame(court: Court, score: [number, number], profiles: Map<string, Profile>): Map<string, Profile>;
```

## Behavior

1. Convert each player's `mu` and `sigma` to OpenSkill's scale, update with the game result, convert back.
2. `skillSource` becomes `games` after the first recorded game.

## Acceptance criteria

- **RATE-1** Winners' `mu` goes up and losers' goes down.
- **RATE-2** Every player's `sigma` goes down after a game.
- **RATE-3** A player with a high sigma (video estimate) moves more than one with a low sigma (DUPR).

## Open questions

- Score margin? **Default:** win or loss only.
