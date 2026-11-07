# 010: Vision

Status: Draft
Prefix: `VIS`
Step: 2.1

## Purpose

Turns a clip of doubles or drilling into per-player stats that don't depend on tracking the ball. Wraps our fork of Pickleball-Vision.

## Non-goals

- Ball tracking, line calls, ball speed.
- Running live on stage. Clips are processed ahead of time and cached.
- Computing a skill rating. That's 020's job, from these stats.

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
  framesSeen: number;
  kitchenLineShare: number;    // 0..1, share of time within ~1 m of the non-volley line
  distanceM: number;           // total distance covered, court coordinates
  avgPartnerSpacingM: number | null;
  readyPositionShare: number;  // 0..1, paddle up and knees bent, from pose
  shotLabels?: Record<"dink" | "drive" | "drop" | "lob" | "volley" | "serve", number>; // counts, from Gemini, optional
};
```

## Behavior

1. Map the video onto the court with the four corner points (homography).
2. Detect and track players (YOLO + ByteTrack). Drop tracks seen in fewer than 10% of frames.
3. Compute kitchen-line share, distance and partner spacing in court coordinates.
4. Run pose and compute ready-position share.
5. Optionally sample the clip at 5 fps through Gemini and count shot labels per player.

## Acceptance criteria

- **VIS-1** Given a clip and four corners, when the pipeline runs, then it writes JSON that matches `ClipStats`.
- **VIS-2** Given a player standing within 1 m of the non-volley line in 80% of frames, then `kitchenLineShare` is between 0.7 and 0.9 (tested on synthetic tracks, not video).
- **VIS-3** Tracks seen in fewer than 10% of frames are dropped.
- **VIS-4** Without Gemini credentials, the pipeline still runs and leaves `shotLabels` out.

## Open questions

- How to tell which track is the player who uploaded the clip? **Default:** they tap themselves on the first frame.
