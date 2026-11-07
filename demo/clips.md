# Demo clips

Public YouTube rec-play videos we use in the demo. **Jake and his teammate find the clips** and add one row per clip (link, level, which players to use). The coding agent takes it from there: it runs the vision pipeline on each clip and caches the stats in `product/fixtures/`.

What makes a good clip:
- Fixed camera, filmed from behind the baseline, whole court visible. No pro broadcasts (camera cuts and zooms break court mapping).
- Skill level in the title (3.0, 4.0, 5.0), so we have a known answer for scene 5.
- For scene 4: two players at the same level with clearly different styles (one hits hard, one plays soft).

Rules: link only. Any local copy stays in `demo/clips/` (gitignored) on one laptop. Credit the channel on screen.

| Clip | Channel | Labeled level | Players we use | Start time | Used in |
| --- | --- | --- | --- | --- | --- |
