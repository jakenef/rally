# Gemini accuracy on real clips (2026-11-07)

Nine YouTube rec clips (`demo/clips.md`), levels as stated by the uploaders: one 3.0, two 4.0, three 4.5, three 5.0. Each run scored three ways: raw error of Gemini's midpoint; error after a "shift" correction scored leave-one-out (each clip corrected using the other eight); correlation with the labels.

| Run | What Gemini watched | Raw error | Corrected (left out) | Within 0.5 | Correlation | Rally shots seen (median) |
| --- | --- | --- | --- | --- | --- | --- |
| A | one player, 60 s | 0.89 | 0.48 | 6/9 | 0.44 | 3 |
| B | one player, 180 s | 0.81 | 0.62 | 4/9 | -0.22 | 11 |
| C | whole game, 180 s | 0.75 | 0.62 | 4/9 | 0.15 | n/a |

## What we learned

- **Gemini grades low and squeezes everything toward 3.5 to 4.0.** It separates a 3.0 game from a 4.0 game, but rates every 4.5 and 5.0 clip at about 3.5 to 4.0.
- **More evidence didn't fix it.** Three minutes gave it 3 to 4 times as many shots, and it got more uniform, not more accurate. Run A's better numbers rest on 0 to 8 shots per player, so they're likely luck.
- **The labels are shaky.** They're the uploaders' claims. One "5.0" clip's longest dink rally was 3 shots.
- **The shift correction helps the average miss**, but nine clips can't show whether one prompt beats another.

## What we use

Run B (one player, 180 s) with the shift correction. It rests on the most evidence. The app's accuracy page (`/player/accuracy`) shows these numbers, leave-one-out, so it can't flatter itself.

## For the pitch

The video gives a starting range, labeled with its confidence; game results take over after one session (060). That's the design (`idea/positioning.md`), and these numbers are why.

## If there's time

- Better-labeled clips: tournament footage with the players' actual DUPR ratings, instead of uploader titles.
- More clips at 4.5 and 5.0, where Gemini is weakest.
- Have Gemini compare two clips ("which game is stronger?") instead of grading each on an absolute scale.
