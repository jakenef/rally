# Decisions

Judgment calls made while building, one line each: `- <spec> <criterion>: what we chose, because ...`.

## Product

- 2026-11-06 accent correction: Jake clarified that red should remain the dominant accent. Restore solid crimson for default headline accents, the homepage's "court time.", marquee, and prominent ratings. Reserve black fill/white outlines for the main video-rating heading via explicit `ch-hl-outline` opt-in. This supersedes the broad white-outline rollout.
- 2026-11-06 preview before merge: Jake requires screenshots to be captured and inspected for visual changes, then a preview for his approval before merging. Passing automated checks alone is insufficient; unavailable browser access must not be treated as visual verification.

- 2026-11-06 white outline accent: Jake requested black-filled, #F5F5F5-outlined display accents across the design system and site, matching the supplied reference. Headline accents, the opposing Mona Sans marquee, and prominent rating text use this treatment; small text, focus rings, and hover boundaries use solid white for legibility. Saturated crimson actions, data marks, and the supplied logo stay as shown in the reference. Presentation only; no feature criteria changed.

- 2026-11-06 logo: Jake supplied the white RALLY/red brush-script artwork as the canonical logo. Preserve the original PNG; `@rally/ui` Logo and its Wordmark compatibility alias render it everywhere. CSS handles display cropping/blending only; browser icons reuse the same asset.

- 2026-11-06 Overtime color refinement: Jake found the opposing slogan row too pale. Its large text now uses the same saturated `crimson` as the hero and primary action; small text and focus rings retain their higher-contrast token.

- 2026-11-06 Overtime rollout: Jake selected Overtime and authorized the shared rebrand across both lanes. Anton/Mona Sans and neutral black/crimson tokens replace the active crimsonhacks palette; the original artifact remains archived. Keep the original homepage headline, pickleball texture, and opposing two-font slogans, with minimal supporting copy. The four-option design study is retired rather than merged into the app.

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

- 2026-11-06 shared design notice for Jake and Danny: shared headline accents default to solid crimson again, as do the marquee and rating numbers. Outline styling is opt-in only on the main video-rating heading. Hold the correction PR for Jake's screenshot preview before merge.

- 2026-11-06 shared design notice for Jake and Danny: the requested white-outline accent updates shared Overtime tokens/components and the homepage override. Both lanes receive outlined headings and white focus/hover accents through `@rally/ui`; module interfaces and functional state are unchanged.

- 2026-11-06 shared design notice for Jake and Danny: the selected Overtime rollout updates `@rally/ui`, the root layout/homepage, and screen presentation only. Keep module interfaces and functional state unchanged. New UI follows `brand-assets/overtime/README.md`; existing `ch-*` classes and `serif` props remain compatible. The rebrand PR carries both lane labels.

Things one lane needs from the other, or from a shared file: `- <date> <who> asks <whom>: ...`.

## Build

- 050 FILL-1: rank replacements in the exact vacated team/seat using matching.fairness; do not reshuffle the other three players or other courts. Pass the displayed courts as an optional fourth argument to rankWaitlist; its original three-argument interface derives matching's default pre-cancellation assignment. Exclude candidates outside session skill limits; tied scores keep waitlist order.
- 050 FILL-2/FILL-4: backfill shares the Sessions store through cancelSignUp/promoteWaitlisted, supports one vacancy chain per session, and records replies so repeated clicks cannot advance twice or double-count revenue. Declines stay on the waitlist but are skipped for this vacancy. An exhausted/empty waitlist leaves the spot open. No expiry, messaging or payment flow. Recovered revenue is only the displayed-price demo metric.
- 050 demo: /phone runs a resettable browser-local copy of the real demo roster and matching assignment, with cancellation, ranked offers, Accept/Decline, court updates and recovered revenue. Sharing this state with the full dashboard/player screen remains step 1.4. The stored departing ID is a seat marker while vacancy is open; the UI renders it as Open spot and hides that court's fairness until filled.
- 025: uploads are processed on the laptop running the app: the browser posts the file to `/player/api/jobs`, and the app runs `rally_vision players` and `rally_vision analyze` as subprocesses from `product/vision/.venv`. Job folders live in `product/.uploads/` (gitignored). Never deployed.
- 025: picking yourself happens in your own paused video: each time you pause or scrub, YOLO finds the people on that frame (about 4 seconds). Rally crops your box itself and sends it to Gemini with the video (Files API), so you never upload a photo.
- 025: tracking (first 60 s) and Gemini (first 3 min) run side by side; status.json is rewritten atomically after each step so the page can poll it every second. Once tracking finishes, the analyzing screen plays your clip with the YOU box while Gemini keeps watching.
- 025: shot callouts come from Gemini's timed events (`events`, VIS-7), mapped onto the playing video by `offsetSec` (prepared clips are local excerpts starting at `startSec`). Gemini's times are approximate; a callout can land a second early or late.
- 025: the result card is written in the second person by Claude (`claudeCardWriter(.., "you")`); the comparison page keeps the third person.
- 025: Join sends the profile already on the page with the form, instead of rebuilding it (which re-called Claude and took about 5 seconds). Until sessions (040) is in main, Join says the rating is saved.
- 025: the demo controls open with the D key (ignored while typing) or a faint 18 px button in the bottom-right corner; they load a prepared clip's saved analysis without calling Gemini (ONB-5).
- vitest now also runs `app/app/**/*.test.ts` (shared config), so the AI lane's screen logic (shot callouts) is tested.

- 010: we don't fork Pickleball-Vision, because it has no licence file; `detect.py` uses Ultralytics YOLO pose and ByteTrack directly (AGPL-3.0, fine for a public repo).
- 010: Gemini model is `gemini-3.8-flash` (stable, video input; checked 2026-11-07), through the Interactions API with the YouTube link. Custom fps is documented only for uploaded files, so the adapter tries `fps: 5` and falls back to default sampling if refused.
- 010: the pipeline caches three files per clip in `fixtures/clips/` (`.gemini.json`, `.measured.json`, final `.json`), so the measured half can be written by hand if detection fails, and Gemini is never called twice for a clip.
- 010: Gemini calls time out after 180s and retry overloads (429, 5xx) up to 5 times with backoff, switching to `gemini-3.6-flash` after two; every step prints a progress line. A 400 drops the custom fps (and names the time window in the prompt instead). On the 9 real clips, fps 5 on YouTube links was accepted every time.
- 010 VIS-5: `--select` takes the player's position in court metres, not pixels, because the selection happens after mapping onto the court.
- 010: the rubric (`vision/rubric.md`) is built from secondary sites repeating USA Pickleball's level descriptions; we couldn't reach the official text.
- 040 SESS-1/SESS-2: sessions use an explicitly seeded in-memory store with snapshot reads; the shared signUp(sessionId, Profile) contract stays unchanged. Capacity is courts * 4, skill bounds include their endpoints and use mu, and repeated sign-ups are idempotent. The shared paid field is preserved but unused to avoid changing the other lane's interface.
- 040 SESS-3: Danny cut pricing/rule parsing from the demo on 2026-11-06. Use fixed fixture settings; no Claude adapter, approval flow or API key is needed for Sessions.

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

- 2026-11-06 Danny approved one strongest-style accessory per player (power paddle, kitchen chef hat, mobility sneakers, readiness headband) plus skill badge. Strongest-stat ties use that order; stars are illustrative tiers 1–5 derived from round(skill - 1), with numerical skill alongside. Rally animation follows real matching assignments; it does not alter matching logic.

- 2026-11-06 Danny replaced wearable accessories and separate badges with one floating physical 3D card per player: flat playstyle icon, numerical rating and stars, four attribute bars, name and tempo. Cards face the camera, appear only after entering a court, and replace the visible spotlight sidebar. Equivalent player data remains accessible in text.

- 2026-11-06 1.4 card clearance: preserve physical 3D cards, but position them on a foreground camera plane in reserved side columns. Fit the selected court between the columns; cards no longer inherit player depth, where court geometry could occlude them. Browser screenshot review remains pending because the browser access host was unavailable.

- 2026-11-06 030 MATCH-4: for up to 16 players, exhaustively partition courts with tempo compatibility first, visible strongest-style pairs second, and existing fairness score third. Opposing team rows align identical icons and then nearest skill. The same strongest-style helper drives the matcher and rendered icons; star tiers reuse the card drawing. The unchanged demo roster has odd style counts (7 kitchen, 5 power, 3 mobility, 1 readiness), so at least two opponent pairs must differ. Exact demo pairing awaits the user’s profile-adjustment choice; no profiles were relabeled or ratings changed.

- 2026-11-06 1.4 requested skill-band demo: facility-owned demo-lineup.ts derives 16 session profiles with four players each at skill 2, 3, 4, and 6 (1, 2, 3, and 5 stars). Demo-only Carlos power and Olivia readiness overrides make style pairs feasible inside every skill band, with compatible tempos. Source roster remains intact. Dashboard cards, overview icons/stars, baseline/reset, and the real assign() call all consume this same lineup. This resolves the earlier odd-count pairing limitation for the session demo.
