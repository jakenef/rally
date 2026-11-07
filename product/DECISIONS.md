# Decisions

Judgment calls made while building, one line each: `- <spec> <criterion>: what we chose, because ...`.

## Product

- Rally is a hackathon proof of concept: anything the demo doesn't show is faked or left out (see `AGENTS.md`). Dropped SESS-4 (unpaid sign-up timeout) and FILL-3 (offer expiry) for that reason.

- Rally's product is matchmaking, sessions and backfill; the video rating is an input, because DUPR and PB Vision already rate players from video (see `idea/positioning.md`).
- No ball tracking at the hackathon, because it's the riskiest vision piece; stats come from player position and pose (see `research/risks.md`).
- DUPR lookup is mocked, because we found no public API.
- No real messaging at all (no SMS, calls or email); backfill offers show on an on-screen fake phone, because a real integration takes too long for little demo value.
- No payment flow, including simulated payments or a Pay button, per Danny on 2026-11-06. Only build what appears in the demo. Price stays as a displayed session rule and recovered revenue as a demo metric.
- Demo footage is public YouTube rec play, not our own filming; see `demo/clips.md`.
- 030: matching uses the mirror rule (both teams get the same style mix) and a player-chosen tempo, not "complementary partners", because coaching advice disagrees on partner style but agrees mismatches across the net ruin rec games (`research/play-styles.md`).

- Gemini is required: it's the only practical way to judge shot quality from video in hours. Local open-source vision (Pickleball-Vision, YOLO, ByteTrack, RTMPose) measures movement; Gemini judges play; 020 combines them into an estimated DUPR range and an athleticism score.

## Asks

Things one lane needs from the other, or from a shared file: `- <date> <who> asks <whom>: ...`.

## Build

- 050 FILL-1: rank replacements in the exact vacated team/seat using matching.fairness; do not reshuffle the other three players or other courts. Pass the displayed courts as an optional fourth argument to rankWaitlist; its original three-argument interface derives matching's default pre-cancellation assignment. Exclude candidates outside session skill limits; tied scores keep waitlist order.
- 050 FILL-2/FILL-4: backfill shares the Sessions store through cancelSignUp/promoteWaitlisted, supports one vacancy chain per session, and records replies so repeated clicks cannot advance twice or double-count revenue. Declines stay on the waitlist but are skipped for this vacancy. An exhausted/empty waitlist leaves the spot open. No expiry, messaging or payment flow. Recovered revenue is only the displayed-price demo metric.
- 050 demo: /phone runs a resettable browser-local copy of the real demo roster and matching assignment, with cancellation, ranked offers, Accept/Decline, court updates and recovered revenue. Sharing this state with the full dashboard/player screen remains step 1.4. The stored departing ID is a seat marker while vacancy is open; the UI renders it as Open spot and hides that court's fairness until filled.

- 010: we don't fork Pickleball-Vision, because it has no licence file; `detect.py` uses Ultralytics YOLO pose and ByteTrack directly (AGPL-3.0, fine for a public repo).
- 010: Gemini model is `gemini-3.8-flash` (stable, video input; checked 2026-11-07), through the Interactions API with the YouTube link. Custom fps is documented only for uploaded files, so the adapter tries `fps: 5` and falls back to default sampling if refused.
- 010: the pipeline caches three files per clip in `fixtures/clips/` (`.gemini.json`, `.measured.json`, final `.json`), so the measured half can be written by hand if detection fails, and Gemini is never called twice for a clip.
- 010 VIS-5: `--select` takes the player's position in court metres, not pixels, because the selection happens after mapping onto the court.
- 010: the rubric (`vision/rubric.md`) is built from secondary sites repeating USA Pickleball's level descriptions; we couldn't reach the official text.
- 040 SESS-1/SESS-2: sessions use an explicitly seeded in-memory store with snapshot reads; the shared signUp(sessionId, Profile) contract stays unchanged. Capacity is courts * 4, skill bounds include their endpoints and use mu, and repeated sign-ups are idempotent. The shared paid field is preserved but unused to avoid changing the other lane's interface.
- 040 SESS-3: Danny cut pricing/rule parsing from the demo on 2026-11-06. Use fixed fixture settings; no Claude adapter, approval flow or API key is needed for Sessions.

- 020: the card is written by `claude-opus-5-5` (structured output, effort low) with server-side refusal fallback (`fallbacks: "default"`), only when `ANTHROPIC_API_KEY` is set; otherwise, or on any error, the template card (PRO-4). Cards are cached in memory per clip so a page reload doesn't call Claude again.
- 020: calibration is a small ridge regression on the gap between the labeled level and Gemini's midpoint, over five measured features (kitchen share, ready share, athleticism, third-shot drop share, unforced errors per minute). Under 8 labeled clips it's skipped and confidence caps at medium.
- 020 PRO-7: "the two signals differ by more than 0.75" is read as the calibration moving Gemini's range by more than 0.75.
- 020: a player with no clip, DUPR or self-rating gets skill 3.0 with sigma 1.0 (source `self`), so matching still has a number.
- 020: `/player` shows the one player Gemini graded per clip; the other tracked players have no assessment, so they aren't profiled.
- 020: `/player/compare` uses two processed clips when there are two, else the scene 4 pair from the roster.
- 0.1: the app loads Mona Sans and Italiana with a `<link>` in `app/layout.tsx` instead of the design system's CSS `@import`, because Next.js bundles CSS files together and an `@import` in the middle is dropped.
- 0.1: the nav mark is the crimsonhacks `Wordmark` with Rally's own word ("Rally", serif, no sans line), because the system has no logo file and its Wordmark is crimsonhacks' own mark.
- 0.1: workspace packages are TypeScript source with no build step, compiled by Next (`transpilePackages`) and vitest, to keep the hackathon setup to one `npm install`.
- 0.2: the roster has 18 players: p01 to p16 signed up for 4 courts, p17 and p18 on the waitlist; p05 to p08 are the scene 4 group (equal skill, two hard hitters, two soft players).

- 030 MATCH-2: Danny explicitly deferred benching on 2026-11-06. This increment accepts only full groups of four with enough courts, returns an empty benched list, and does not read games-played counts. MATCH-2 remains deferred.
- 030 MATCH-3/MATCH-4: score is 100 minus weighted penalties (55 team balance, 20 court spread, 25 mirror), clamped to 0..100. Balance normalizes at a 0.8 summed-skill gap; spread at 1.5; mirror uses the sum of absolute team power and kitchen gaps, capped at 2. A double mirror penalty allows the required >=30-point equal-skill contrast, impossible with a mirror component capped at 25. Scores are demo heuristics, not validated outcomes.
- 030 MATCH-7: construct separate fast/soft groups filled with any-tempo players when feasible, then run 2,000 seeded local-search swaps. Tempo conflicts take priority over score improvements. Skill-only baseline chooses the minimum team skill gap and retains stable ties.
