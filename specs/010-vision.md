# 010: Vision

Status: Draft
Prefix: `VIS`
Step: 2.1
Lane: AI (Jake). Only that lane changes this module's code (see `specs/README.md`, Lanes).

## Purpose

Turns a clip into two kinds of per-player information:

- **Measured** (local, open source): our fork of Pickleball-Vision (YOLO + ByteTrack, court homography, RTMPose). Where players are and how they move. Precise, but blind to shot quality.
- **Watched** (Gemini): what a coach would see. Shot types, how rallies go, and a level estimate against a written rubric. Sees quality, but less precise.

020 combines them into an estimated DUPR range.

## Non-goals

- Ball tracking, line calls, ball speed.
- Running live on stage. Clips are processed ahead of time and cached.
- Computing a skill rating. That's 020's job, from these stats.
- Filming our own footage. Clips are public YouTube rec play (`demo/clips.md`). Pro broadcasts are out: they cut between cameras and zoom, which breaks court mapping.

## Interface

Command: `python -m rally_vision <clip> --corners x1,y1,x2,y2,x3,y3,x4,y4 --out stats.json`

```ts
type ClipStats = {
  clipId: string;
  durationSec: number;
  players: PlayerStats[];
};
type PlayerStats = {
  trackId: number;             // stable within the clip
  selected?: boolean;          // the player clicked in the first frame
  framesSeen: number;
  kitchenLineShare: number;    // 0..1, share of time within ~1 m of the non-volley line
  distanceM: number;           // total distance covered, court coordinates
  avgPartnerSpacingM: number | null;
  readyPositionShare: number;  // 0..1, paddle up and knees bent, from pose
  avgSpeedMps: number;         // court coordinates
  peakSpeedMps: number;
  watched?: GeminiAssessment;  // only for the selected player
};
type GeminiAssessment = {
  shots: Record<"dink" | "drive" | "drop" | "lob" | "volley" | "serve" | "return", number>;
  thirdShotDropShare: number | null;  // third shots that were drops
  unforcedErrors: number;
  resetsUnderPressure: number;        // soft blocks of hard balls
  levelEstimate: { low: number; high: number };  // 2.0..6.0, from the rubric
  reasons: string[];                  // what it saw, quoted on the player card
  events?: ShotEvent[];              // each shot the player hit, with its time (VIS-7)
};
type ShotEvent = {
  t: number;                          // seconds on the video's own timeline
  shot: "dink" | "drive" | "drop" | "lob" | "volley" | "serve" | "return" | "reset" | "speedup" | "putaway" | "error";
  label: string;                      // a short callout, 1 to 3 words: "Third-shot drop", "Soft reset"
};
```

## Behavior

1. Map the video onto the court with the four corner points (homography).
2. Detect and track players (YOLO + ByteTrack). Drop tracks seen in fewer than 10% of frames.
3. Compute kitchen-line share, distance and partner spacing in court coordinates.
4. Run pose and compute ready-position share.
5. Send the clip to Gemini at 5 fps (the default 1 fps misses fast play), with the selected player described by position and clothing, and the rubric in `rubric.md` (USA Pickleball's skill level descriptions, 2.0 to 5.0+, rewritten as observable behaviors). Ask for structured output matching `GeminiAssessment`. Gemini takes the YouTube URL directly, so this step needs no local copy.
6. Cache the whole result per clip, so the demo never waits on Gemini.

## Acceptance criteria

- **VIS-1** Given a clip and four corners, when the pipeline runs, then it writes JSON that matches `ClipStats`.
- **VIS-2** Given a player standing within 1 m of the non-volley line in 80% of frames, then `kitchenLineShare` is between 0.7 and 0.9 (tested on synthetic tracks, not video).
- **VIS-3** Tracks seen in fewer than 10% of frames are dropped.
- **VIS-4** Gemini's reply is checked against `GeminiAssessment`; a reply that doesn't match is retried once, then the clip is marked failed (tested with the fake).
- **VIS-6** A clip that was processed before is served from the cache without calling Gemini.
- **VIS-7** Gemini's reply lists the graded player's shots with times; times outside the watched window, or labels over 3 words, are dropped.
- **VIS-8** A local video file (an upload) is sent to Gemini through the Files API, with a cropped image of the picked player so Gemini knows who to grade.
- **VIS-9** Finding players on a chosen frame returns every person box on that frame, in under 10 seconds.
- **VIS-5** Given a click on a player in the first frame, the output marks the track nearest that point as `selected`.

## Open questions

- How to tell which player we're profiling? **Default:** they click their own box on a frame near the start (025 step 2); prepared clips use `fixtures/clips/selection.json`.
- Local copies of YouTube clips: downloading is against YouTube's terms. **Default:** keep any copy on one laptop for the pipeline, never in git, and credit the channel on screen.
