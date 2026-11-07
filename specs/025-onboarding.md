# 025: Onboarding (get your rating)

Status: Draft
Prefix: `ONB`
Step: 2.3
Lane: AI (Jake). Only that lane changes this module's code (see `specs/README.md`, Lanes).

## Purpose

What a player sees when someone sends them the Rally link: they upload a clip of themselves playing, point at which player they are, watch Rally analyze them, and get **their** estimated DUPR, play style and a tip, then join a session. It's a consumer self-onboarding flow, abstracted for the demo (no real account), built on 010 (vision) and 020 (profiles).

## Non-goals

- Real accounts, sign-in, email or storage beyond the laptop running the demo.
- Uploads from other machines or deployment. Uploads are processed on the local laptop.
- Long videos. Tracking covers the first 60 seconds; Gemini watches the first 3 minutes.

## Flow

1. **Upload.** "Get your Rally rating." Drag a video onto the page, or pick one. The page shows upload progress.
2. **Which one is you?** Their video appears paused with a box on every player. They can scrub to any moment where they're easy to see; Rally finds the players on that frame. They click their own box. Rally crops that box itself and sends it to Gemini with the video, so Gemini knows who to grade; the player never uploads a photo.
3. **Analyzing.** The clip plays while Rally tracks the players and Gemini watches. The page shows each step with its progress, and the time so far.
4. **Your rating.** The clip plays with the tracking overlay: a crimson box labeled "YOU", and a callout near it each time Gemini saw them hit a shot ("THIRD-SHOT DROP", "DINK", "PUT-AWAY"), with a running count of their shots under the video. Next to it, the card in the second person: "Your estimated DUPR", "Your play style", "Your tip".
5. **Join.** They enter a first name and pick their tempo (soft, fast, either), then join tonight's session (040 `signUp`).

## Demo controls

A hidden panel for the presenter, opened with the `D` key or a small unlabeled corner button. It lists the prepared clips (`demo/clips.md`); choosing one runs the same flow from step 2 with cached results, so the demo never waits on Gemini. It also links to the comparison (scene 4) and accuracy (scene 5) pages, and resets the flow.

## Interface

```ts
// POST /player/api/jobs            multipart file -> { jobId }
// GET  /player/api/jobs/:id        -> JobStatus
// GET  /player/api/jobs/:id/players?t=12.4 -> { t, boxes } (people on the frame at t)
// POST /player/api/jobs/:id/select { t: number, box: [x1, y1, x2, y2] } -> JobStatus
// GET  /player/api/jobs/:id/video  -> video (range requests)
// GET  /player/api/clips/:clipId   -> Result for a prepared clip
type JobStatus = {
  stage: "uploaded" | "finding" | "pick" | "analyzing" | "done" | "failed";
  steps: { name: string; state: "waiting" | "running" | "done" | "failed"; detail?: string }[];
  players?: { box: [number, number, number, number] }[]; // 0..1, on the pick frame
  result?: Result;
  error?: string;
};
type Result = {
  videoUrl: string;
  overlayUrl: string | null;
  offsetSec: number;          // subtract from shot times to get video time
  events: ShotEvent[];         // from 010
  profile: Profile;            // with card, written in the second person
  credit?: string;             // channel, for prepared clips
};
```

## Acceptance criteria

- **ONB-1** Dropping a video file starts a job and shows the video paused with the players found on that frame, each clickable; scrubbing to another moment finds the players there.
- **ONB-2** Picking a player starts tracking and Gemini; the status lists both steps with live progress until done.
- **ONB-3** The result's card is in the second person ("Your estimated DUPR", "Your tip") and the graded player's box is labeled "YOU".
- **ONB-4** During playback, each shot event shows a callout near the player for about 1.5 seconds, and the shot counts under the video only include shots already played.
- **ONB-5** The demo controls are hidden until opened, and choosing a prepared clip shows its result without calling Gemini.
- **ONB-6** A video the pipeline can't read ends the job as "failed" with a message, and the page offers to try another clip.

## Open questions

- Several clips per player? **Default:** one clip; uploading another replaces the result.
