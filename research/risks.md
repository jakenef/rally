# Risks, worst first

1. **Rating accuracy is what judges will poke at.** Show a range with confidence, mix in self-rating and DUPR, and let OpenSkill correct it after one session. Never claim an accurate rating from 60 seconds.
2. **Ball tracking from phone video is a rabbit hole.** Don't. Use signals that don't need the ball: kitchen-line time and movement from court-mapped player tracks, ready position from pose, shot types from Gemini.
3. **Footage quality and camera angle.** Court mapping needs a fairly fixed camera and 4 corner taps. Pre-record 3 to 4 clips from behind the baseline.
4. **Processing time.** The Python pipeline is too slow to run live on stage. Pre-process and cache demo clips; run one short clip live in the browser version.
5. **Marketplace cold start.** We sell to facilities, which already have players.
6. **The matcher is our own algorithm, so it has to be visible.** Show fairness scores and the before/after reshuffle.
7. **Privacy.** We handle video of people. The browser mode never uploads video; say so.
