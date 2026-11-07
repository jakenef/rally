# Risks, worst first

1. **Rating accuracy is what judges will poke at.** Show a range with confidence, mix in self-rating and DUPR, and let OpenSkill correct it after one session. Never claim an accurate rating from 60 seconds.
2. **Ball tracking from phone video is a rabbit hole.** Don't. Local vision measures position and movement; Gemini watches for shot quality. Neither needs the ball tracked.
3. **Gemini's level estimate may be biased or noisy.** Give it a written rubric, ask for reasons, calibrate on labeled clips, and show the error honestly (020 PRO-6).
4. **Footage quality and camera angle.** Court mapping needs a fairly fixed camera and 4 corner taps. Use fixed-camera YouTube rec play filmed from behind the baseline; avoid pro broadcasts, which cut between cameras and zoom.
5. **Processing time.** The Python pipeline is too slow to run live on stage. Pre-process and cache demo clips; run one short clip live in the browser version.
6. **Marketplace cold start.** We sell to facilities, which already have players.
7. **The matcher is our own algorithm, so it has to be visible.** Show fairness scores and the before/after reshuffle.
8. **Privacy.** We handle video of people. The browser mode never uploads video; say so.
