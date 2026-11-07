# Decisions

Judgment calls made while building, one line each: `- <spec> <criterion>: what we chose, because ...`.

## Product

- 2026-11-06 Overtime rollout: Jake selected Overtime and authorized the shared rebrand across both lanes. Anton/Mona Sans and neutral black/crimson tokens replace the active crimsonhacks palette; the original artifact remains archived. Keep the original homepage headline, pickleball texture, and opposing two-font slogans, with minimal supporting copy. The four-option design study is retired rather than merged into the app.

- Rally is a hackathon proof of concept: anything the demo doesn't show is faked or left out (see `AGENTS.md`). Dropped SESS-4 (unpaid sign-up timeout) and FILL-3 (offer expiry) for that reason.

- Rally's product is matchmaking, sessions and backfill; the video rating is an input, because DUPR and PB Vision already rate players from video (see `idea/positioning.md`).
- No ball tracking at the hackathon, because it's the riskiest vision piece; stats come from player position and pose (see `research/risks.md`).
- DUPR lookup is mocked, because we found no public API.
- No real messaging at all (no SMS, calls or email); backfill offers show on an on-screen fake phone, because a real integration takes too long for little demo value.
- No real payments: no Stripe; a Pay button marks a sign-up paid, because it looks the same on stage.
- Demo footage is public YouTube rec play, not our own filming; see `demo/clips.md`.
- 030: matching uses the mirror rule (both teams get the same style mix) and a player-chosen tempo, not "complementary partners", because coaching advice disagrees on partner style but agrees mismatches across the net ruin rec games (`research/play-styles.md`).

- Gemini is required: it's the only practical way to judge shot quality from video in hours. Local open-source vision (Pickleball-Vision, YOLO, ByteTrack, RTMPose) measures movement; Gemini judges play; 020 combines them into an estimated DUPR range and an athleticism score.

## Asks

- 2026-11-06 shared design notice for Jake and Danny: the selected Overtime rollout updates `@rally/ui`, the root layout/homepage, and screen presentation only. Keep module interfaces and functional state unchanged. New UI follows `brand-assets/overtime/README.md`; existing `ch-*` classes and `serif` props remain compatible. The rebrand PR carries both lane labels.

Things one lane needs from the other, or from a shared file: `- <date> <who> asks <whom>: ...`.

## Build

- 010: we don't fork Pickleball-Vision, because it has no licence file; `detect.py` uses Ultralytics YOLO pose and ByteTrack directly (AGPL-3.0, fine for a public repo).
- 010: Gemini model is `gemini-3.8-flash` (stable, video input; checked 2026-11-07), through the Interactions API with the YouTube link. Custom fps is documented only for uploaded files, so the adapter tries `fps: 5` and falls back to default sampling if refused.
- 010: the pipeline caches three files per clip in `fixtures/clips/` (`.gemini.json`, `.measured.json`, final `.json`), so the measured half can be written by hand if detection fails, and Gemini is never called twice for a clip.
- 010: Gemini calls time out after 180s and retry overloads (429, 5xx) up to 5 times with backoff, switching to `gemini-3.6-flash` after two; every step prints a progress line. A 400 drops the custom fps (and names the time window in the prompt instead). On the 9 real clips, fps 5 on YouTube links was accepted every time.
- 010 VIS-5: `--select` takes the player's position in court metres, not pixels, because the selection happens after mapping onto the court.
- 010: the rubric (`vision/rubric.md`) is built from secondary sites repeating USA Pickleball's level descriptions; we couldn't reach the official text.
- 020: the card is written by `claude-opus-5-5` (structured output, effort low) with server-side refusal fallback (`fallbacks: "default"`), only when `ANTHROPIC_API_KEY` is set; otherwise, or on any error, the template card (PRO-4). Cards are cached in memory per clip so a page reload doesn't call Claude again.
- 010: Gemini watches 3 minutes from each clip's start (`--window`, default 180s), not 60s: in 60s it saw only 1 to 10 rally shots per player, too little to grade, and it pulled every grade toward 3.0 to 3.5.
- 010: clips whose camera angle defeats court mapping are built from Gemini alone (`measured: false`, one player). Their style uses Gemini's shot mix for kitchen and 0.5 for mobility and readiness, and they get no athleticism score.
- 020: with any clip lacking measured stats, calibration is a "shift": add the average gap between label and Gemini's midpoint. On the 9 clips (60s windows) that halved the error, scored leave-one-out.
- 010 overlay: boxes are drawn in video pixels, so they need no court mapping and work on every camera angle. Only the laptop with the clips (`demo/clips/`) shows them; others get the YouTube embed.
- 010 overlay: the graded player is followed by position, then by torso colors when players are close or after losing them; a look-alike within 0.1, a box cut off by the frame edge, or a box under a quarter of their starting size ends the highlight. A wrong box is worse than none. Followed in 41 to 100% of each clip; `f5WajWaVLfM` still has doubtful moments, so don't use it on stage.
- App env: `next.config.ts` finds the product folder (the one holding `vision/`) from either start location and loads its env files with `forceReload`, because Next has already loaded its own folder's files and would otherwise skip them.
- 020: Claude is told to mention only what it's given (no athleticism without a number, no observations without Gemini's), after it invented both in testing.
- 020: every reported accuracy number is leave-one-out: each clip is estimated with a calibration fitted without its own label, in the app too, so the demo can't flatter itself.
- 020 PRO-7 (revised): only the measured-feature part of the correction counts as "disagreement"; a constant shift doesn't lower confidence. Confidence is also low when Gemini saw fewer than 8 rally shots, and high only when the calibration's leave-one-out error is 0.3 or less.
- 020 (old) calibration is a small ridge regression on the gap between the labeled level and Gemini's midpoint, over five measured features (kitchen share, ready share, athleticism, third-shot drop share, unforced errors per minute). Under 8 labeled clips it's skipped and confidence caps at medium.
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

- 1.4 Dashboard: integrated Danny's approved facility → court → player preview into /dashboard using the active Overtime system. The real matching engine supplies assignments; demo reset restores the seed-42 fixture layout. Three.js and fonts are bundled locally. Power changes the ball stripe width; kitchen tendency changes printed pattern density; these are visual encodings, not new ratings. Danny explicitly requested the slow bobbing and hover glow/lift.
- 1.4 Scope: this increment is the requested matching frontend only. Cancellations, backfill, and phone wiring remain pending; do not mark the whole Dashboard build step complete. Renderer cleanup releases GPU resources and animation on navigation.
