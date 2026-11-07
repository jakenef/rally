# Vision (AI lane, Jake)

Spec 010. Clip in, `ClipStats` JSON out (the shape is in `../packages/types/src/index.ts`).

Step 2.1 forks [Pickleball-Vision](https://github.com/ArvanJ/Pickleball-Vision) into this folder and adds the Gemini assessment. Until then `python -m rally_vision` only checks its arguments.

```sh
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/pytest
.venv/bin/python -m rally_vision <clip> --corners x1,y1,x2,y2,x3,y3,x4,y4 --out stats.json
```

Output for demo clips goes to `../fixtures/clips/<clipId>.json`.
