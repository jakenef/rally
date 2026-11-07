# Vision (AI lane, Jake)

Spec 010. A YouTube clip in, `ClipStats` JSON out (the shape is in `../packages/types/src/index.ts`). Two halves:

- **Watched** (`gemini.py`): Gemini (`gemini-3.8-flash`) watches the clip at 5 fps and grades one player against `rubric.md`. Takes the YouTube link directly; no download.
- **Measured** (`detect.py` then `measure.py`): Ultralytics YOLO pose with ByteTrack follows each player; the four court corners map their feet onto the court; `measure.py` turns tracks into kitchen-line time, speed, distance, partner spacing and ready position. Needs a local copy of the clip.

## Setup

```sh
python3 -m venv .venv
.venv/bin/pip install -e ".[gemini,dev]"      # add ,detect for local detection (Ultralytics, OpenCV)
.venv/bin/pytest
```

Put `GEMINI_API_KEY=...` in `product/.env` or `product/.env.local` (both gitignored). Override the model with `GEMINI_MODEL`.

## All clips at once

```sh
.venv/bin/python -m rally_vision assess-all          # every row in demo/clips.md not cached yet, with [n/N] progress
.venv/bin/python -m rally_vision assess-all --only abc123 --refresh
```

About 25 seconds per clip when Gemini is healthy. Results are cached in `fixtures/clips/<id>.gemini.json`, so the demo never waits.

Then build the clip files the app reads (works from Gemini alone when there's no measured file):

```sh
.venv/bin/python -m rally_vision build-all
```

## Uploads (the get-your-rating flow, spec 025)

The app runs these itself; you don't need to.

```sh
.venv/bin/python -m rally_vision players path/to/clip.mp4 --t 12.5          # people on that frame, JSON
.venv/bin/python -m rally_vision analyze product/.uploads/<job> --t 12.5 --box 0.4,0.2,0.5,0.9
```

`analyze` tracks the first minute and has Gemini watch the first three (with a crop of the picked player), side by side, writing progress to `<job>/status.json`.

## Tracking overlay (the boxes on the video, scene 2)

Needs the local clips in `demo/clips/` and the `detect` extra (`pip install -e ".[gemini,detect,dev]"`).

```sh
.venv/bin/python -m rally_vision overlay-all             # about 30 s per clip on a Mac GPU, cached in fixtures/clips/<id>.overlay.json
.venv/bin/python -m rally_vision overlay-all --refollow  # redo only the following of the graded player (fast)
```

YOLO and ByteTrack box every person; the graded player is picked by the point in `fixtures/clips/selection.json` (video pixels, 10 s in) and then followed by position and clothing colors, so tracker ID switches don't lose them. When two look-alike players cross, or the player leaves the frame, the highlight stops rather than guess.

## Per clip (from `demo/clips.md`)

```sh
# 1. Gemini grades the player (cached in fixtures/clips/<id>.gemini.json; --refresh to redo)
.venv/bin/python -m rally_vision assess c1 "https://www.youtube.com/watch?v=..." --player "near side, left, red shirt" --start 1:42

# 2. Measured stats from a local copy (or write fixtures/clips/<id>.measured.json by hand: the fallback)
.venv/bin/python -m rally_vision measure c1 "https://www.youtube.com/watch?v=..." --video ~/clips/c1.mp4 \
  --corners 210,690,1070,690,840,250,440,250 --select 1.5,3.0 --start 1:42 --duration 60

# 3. Combine into fixtures/clips/<id>.json, which the app reads
.venv/bin/python -m rally_vision build c1
```

- `--corners`: the court's corners in the video's pixels, in this order: near-left, near-right, far-right, far-left.
- `--select`: where the player to profile stands in the first frame, in court metres (x across 0 to 6.1, y from the near baseline 0 to 13.4).
- Local copies of YouTube videos stay on your laptop, never in git.

## Status

- Gemini half: built and tested against a fake. Not yet run against the real API (needs the key and a clip). Custom fps is documented for uploaded files; for YouTube links the adapter tries it and falls back to Gemini's default sampling if refused.
- Measured half: `measure.py` is tested on synthetic tracks. `detect.py` is untested until we have a clip.
- We don't fork Pickleball-Vision: it has no licence file. Ultralytics is AGPL-3.0, fine for this public repo.
