# Demo clips

Public YouTube rec-play videos we use in the demo. **Jake and his teammate find the clips** and add one row per clip (link, level, which players to use). The coding agent takes it from there: it runs the vision pipeline on each clip and caches the stats in `product/fixtures/`.

What makes a good clip:
- Fixed camera, filmed from behind the baseline, whole court visible. No pro broadcasts (camera cuts and zooms break court mapping).
- Skill level in the title (3.0, 4.0, 5.0), so we have a known answer for scene 5.
- For scene 4: two players at the same level with clearly different styles (one hits hard, one plays soft).

Rules: link only. Any local copy stays in `demo/clips/` (gitignored) on one laptop. Credit the channel on screen.

| Clip | Channel | Labeled level | Players we use | Start time | Used in |
| --- | --- | --- | --- | --- | --- |
| [f5WajWaVLfM](https://www.youtube.com/watch?v=f5WajWaVLfM) | RallyPoint by Suffolk Pickleball Co. | 3.0+ | near side, right: woman in white tank top and black leggings, ponytail | 0:00 | answer key |
| [IUd_2A3VewE](https://www.youtube.com/watch?v=IUd_2A3VewE) | Zero Zero One PB | 4.0 | near side, left: white t-shirt, white cap, khaki shorts | 1:52 | answer key |
| [bW-4z3Br7uE](https://www.youtube.com/watch?v=bW-4z3Br7uE) | Wise Pickleball | 4.0 | near side: tan t-shirt, gray shorts | 1:15 | answer key |
| [RijUJWIBe_o](https://www.youtube.com/watch?v=RijUJWIBe_o) | Wise Pickleball | 4.5 | near side: black hoodie, gray sweatpants, beanie | 1:15 | answer key |
| [DkSnVZgmFF0](https://www.youtube.com/watch?v=DkSnVZgmFF0) | Dan Plays Pickleball | 4.5+ | camera side: brown t-shirt, black shorts, neon green shoes | 0:30 | answer key |
| [R3KB2sRZccU](https://www.youtube.com/watch?v=R3KB2sRZccU) | Dan Plays Pickleball | 4.5 | camera side, closest to the camera: gray t-shirt, dark green shorts, neon green shoes | 0:31 | answer key, scene 4 |
| [euP6ns-3UXY](https://www.youtube.com/watch?v=euP6ns-3UXY) | The Pickleball Pirates | 5.0 | near side: red t-shirt, navy shorts | 0:00 | answer key |
| [b2Pzi5_dBGg](https://www.youtube.com/watch?v=b2Pzi5_dBGg) | The Pickleball Pirates | 5.0 | near side: blue t-shirt, black shorts | 0:00 | answer key |
| [u6dqN2ReoOo](https://www.youtube.com/watch?v=u6dqN2ReoOo) | The Pickleball Pirates | 5.0 | near side: white graphic t-shirt, black shorts | 0:20 | answer key, scene 4 |

Added 2026-11-07. The team downloaded 60-second excerpts to `demo/clips/` (gitignored), with `download-manifest.json` listing source, channel, level and window. The clip ID is the YouTube ID. Players were picked from a frame 10 seconds in. Levels marked "+" are treated as the number.

**Camera angles:** most of these are filmed from a corner or the side, not from behind the baseline. Gemini handles that, but court mapping for the measured stats (`measure`) needs the four court corners, so measured stats are hit and miss on these. See `research/risks.md`.
