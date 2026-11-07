# Decisions

Judgment calls made while building, one line each: `- <spec> <criterion>: what we chose, because ...`.

## Product

- Rally's product is matchmaking, sessions and backfill; the video rating is an input, because DUPR and PB Vision already rate players from video (see `idea/positioning.md`).
- No ball tracking at the hackathon, because it's the riskiest vision piece; stats come from player position and pose (see `research/risks.md`).
- DUPR lookup is mocked, because we found no public API.
- No real messaging at all (no SMS, calls or email); backfill offers show on an on-screen fake phone, because a real integration takes too long for little demo value.
- Demo footage is public YouTube rec play, not our own filming; see `demo/clips.md`.
- 030: matching uses the mirror rule (both teams get the same style mix) and a player-chosen tempo, not "complementary partners", because coaching advice disagrees on partner style but agrees mismatches across the net ruin rec games (`research/play-styles.md`).

## Build
