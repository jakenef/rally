# 020: Profiles

Status: Draft
Prefix: `PRO`
Step: 2.2

## Purpose

Turns a clip's measured and watched information (010), plus an optional DUPR or self-rating, into a player's style vector, an **estimated DUPR range**, an **athleticism score** and a player card.

## Non-goals

- Claiming an official or exact rating. The estimate is a range, labeled "estimated DUPR".
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
  estimatedDupr?: { low: number; high: number; confidence: "low" | "medium" | "high" };
  athleticism?: number;                  // 0..100
  skillSource: "dupr" | "video" | "self" | "games";
  tempo: "soft" | "fast" | "any";        // the game they want; player picks it, default "any"
  card?: { headline: string; reasons: string[]; tip: string };  // from Claude, reasons quote what Gemini saw
};
function buildProfile(input: {
  playerId: string; name: string;
  stats?: PlayerStats; dupr?: number; selfRating?: number; tempo?: "soft" | "fast" | "any";
}): Profile;
```

## Behavior

1. Style: `kitchen = kitchenLineShare`, `power = drives / (drives + dinks)` from Gemini's shot counts, `mobility` and `readiness` scaled to 0..1.
2. **Athleticism** (0 to 100): a weighted score from average and peak speed, distance per minute, and ready-position share, scaled against the calibration clips.
3. **Estimated DUPR:** start from Gemini's rubric range. Adjust it with a small linear model over measured features (kitchen share, readiness, athleticism, third-shot drop share, unforced errors per minute) fitted on the calibration clips: YouTube clips whose title gives the level, listed in `demo/clips.md`. Report the range and a confidence from how far the two signals agree.
4. Skill for matching: DUPR if given (sigma 0.25); else the estimated DUPR midpoint, blended with self-rating if given (sigma 0.5); else self-rating alone (sigma 0.8).
5. Tempo is the player's own choice at sign-up ("I want a soft game", "I like it fast", "Either"). It is never inferred from video, because style and preference aren't the same thing.
6. The card is written by Claude from the style, estimated DUPR, athleticism and Gemini's reasons, e.g. "Estimated DUPR 3.5 to 4.0 · Athleticism 72 · Lives at the kitchen line, drops most third shots." Without Claude, a template writes it.

## Acceptance criteria

- **PRO-1** Given a DUPR rating, then `skillSource` is `dupr` and `mu` equals the rating.
- **PRO-2** Given only a clip, then sigma is at least 0.5 and the card shows a range, not a single number.
- **PRO-6** On the calibration clips, the estimated range contains the labeled level for at least half the clips, and the mean error of the midpoint is reported (it goes on the scene 5 slide, whatever it is).
- **PRO-7** When Gemini's range and the measured-feature adjustment differ by more than 0.75, confidence is `low`.
- **PRO-8** Athleticism is between 0 and 100, and a faster player in the same clip scores higher.
- **PRO-3** Every style value is between 0 and 1.
- **PRO-4** Without Claude credentials, a template card is produced.
- **PRO-5** Tempo defaults to `any` and only changes when the player sets it.

## Open questions

- How many calibration clips? **Default:** at least 8, spread over 3.0, 3.5, 4.0, 4.5 and 5.0; fewer means the linear adjustment is skipped and confidence is capped at `medium`.
