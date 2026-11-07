# 020: Profiles

Status: Draft
Prefix: `PRO`
Step: 2.2

## Purpose

Turns stats (010) and optional DUPR or self-rating into a player's style vector, a starting skill range and a player card.

## Non-goals

- Claiming an accurate rating from video. The range is a starting point.
- A real DUPR integration. The lookup is mocked.

## Interface

```ts
type Style = {
  kitchen: number;    // 0..1, lives at the line
  power: number;      // 0..1, drives vs. dinks
  mobility: number;   // 0..1
  readiness: number;  // 0..1
};
type Profile = {
  playerId: string;
  name: string;
  style: Style;
  skill: { mu: number; sigma: number };  // 2.0..6.0 scale
  skillSource: "dupr" | "video" | "self" | "games";
  tempo: "soft" | "fast" | "any";        // the game they want; player picks it, default "any"
  card?: { headline: string; tip: string };  // from Claude
};
function buildProfile(input: {
  playerId: string; name: string;
  stats?: PlayerStats; dupr?: number; selfRating?: number; tempo?: "soft" | "fast" | "any";
}): Profile;
```

## Behavior

1. Style comes from stats: `kitchen = kitchenLineShare`, `power = drives / (drives + dinks)` (0.5 if no shot labels), `mobility` and `readiness` scaled to 0..1.
2. Skill: DUPR if given (sigma 0.25); else a video estimate blended with self-rating (sigma 0.6); else self-rating alone (sigma 0.8).
3. Tempo is the player's own choice at sign-up ("I want a soft game", "I like it fast", "Either"). It is never inferred from video, because style and preference aren't the same thing.
4. The card is written by Claude from the style and skill range. Without Claude, a template writes it.

## Acceptance criteria

- **PRO-1** Given a DUPR rating, then `skillSource` is `dupr` and `mu` equals the rating.
- **PRO-2** Given only stats, then sigma is at least 0.5 and the card shows a range, not a single number.
- **PRO-3** Every style value is between 0 and 1.
- **PRO-4** Without Claude credentials, a template card is produced.
- **PRO-5** Tempo defaults to `any` and only changes when the player sets it.

## Open questions

- How to map stats to a skill estimate? **Default:** a hand-tuned linear score from kitchen share, readiness and mobility, clamped to 2.5..4.5, written in DECISIONS.
