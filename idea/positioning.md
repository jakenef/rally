# Positioning: Rally vs. DUPR

If our pitch is "AI rates your skill from video," we're not different: DUPR and PB Vision already do that. **The rating is an input, not the product.**

## What DUPR's AI rating is

- DUPR is a rating system. It answers "how good is this player?" with one number, mostly from match results.
- Since April 2026, DUPR and PB Vision let a new player get an initial rating from one recorded match, labeled AI-assisted. First analysis is free.
- Its customer is the player (and tournaments and leagues).
- It doesn't decide who plays with whom tonight, run open play, handle cancellations or set prices.

## Side by side

| | DUPR + PB Vision | Rally |
|---|---|---|
| Question | How good are you? | Who should play together right now? |
| Customer | Player | Facility |
| Output | One number | Court assignments, balanced teams, prices, waitlist backfill |
| Timescale | Months | Tonight's 7pm session |
| Video used for | Computing the rating | Play style, which DUPR doesn't give |
| Makes money by | Subscriptions and partner deals | Premium sessions, filling cancelled spots |

## Our three claims

1. **A rating isn't a good game.** Four 3.75s can still have a bad game: two bangers against two dinkers, or someone rusty tonight. Rally balances on rating plus style plus who showed up.
2. **Video gives play style, not a number.** "Kitchen-line player, soft hands, rarely drives" is what makes a court fun, and DUPR doesn't capture it.
3. **Rally does the facility's work.** Premium sessions, backfill, peak pricing. DUPR doesn't touch any of that.

## "Rally runs on DUPR"

- Has a DUPR rating: use it as the starting skill.
- No DUPR rating (most casual players): the clip gives a starting range, marked low confidence.
- Everyone: the clip gives a style profile.
- After each session: results update OpenSkill ratings for that facility's regulars.

We haven't found a public DUPR API. In the demo, the DUPR lookup is mocked; the pitch says "integrates with DUPR where available."

## Judge questions

- **"Isn't this just DUPR?"** DUPR is the rating. We're what happens at the facility at 7pm, and we use DUPR as an input.
- **"Why not just sort by rating?"** Show two courts with the same average rating: one scores 52 for fairness, the other 91.
- **"Could DUPR build this?"** Their customer is the player, ours is the facility. Facilities already pay for booking software; we're the part they'd pay for on top.
- **"How accurate is your video rating?"** It's a starting point with a confidence level. Real results take over after one session.
