# Rally

Balanced pickleball sessions for facilities.

DUPR tells you what you are. Rally decides who you should play tonight, and fills the court when someone bails.

## What it does

- **Player onboarding:** a 60-second clip gives a play-style profile (kitchen-line time, drive vs. dink, movement, ready position) and a rough starting skill range. Uses a DUPR rating as the skill input when a player has one.
- **Balanced sessions:** puts the night's players onto courts and teams by skill and play-style fit, with a fairness score per court.
- **Backfill:** when someone cancels, the next best-fit player on the waitlist gets the spot and pays.
- **Facility rules in plain English:** e.g. "Tuesday 7pm is 3.5+ only, $12 peak."

## Planned stack

- Vision: fork of [Pickleball-Vision](https://github.com/ArvanJ/Pickleball-Vision) (YOLO + ByteTrack, court homography, pose)
- Shot labeling: Gemini video API at higher fps
- Player cards and rule parsing: Claude
- Ratings: [OpenSkill](https://github.com/vivekjoshy/openskill.py)
- App: Next.js, Stripe test mode
