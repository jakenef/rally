# 000: Overview

Status: Draft

## What we're building

A tool for pickleball facilities that sells balanced games instead of court time. Players join from a short clip (or their DUPR rating); the facility runs sessions where Rally assigns courts and teams by skill and play style, sells them at a premium, and fills cancellations from a ranked waitlist. See `idea/pitch.md`.

## Glossary

| Term | Meaning |
| --- | --- |
| **Facility** | A pickleball venue with courts. The customer. |
| **Player** | A person who plays. Has a profile. |
| **Clip** | A short video (up to ~60 s) of a player playing. For the hackathon, public YouTube rec-play footage. |
| **Stats** | Numbers the vision pipeline measures from a clip, per player. |
| **Style vector** | A player's play style as numbers between 0 and 1 (see 020). |
| **Tempo** | The kind of game a player wants: `soft`, `fast` or `any` (see 020). |
| **Mirror rule** | Both teams on a court have the same style mix (see 030). |
| **Skill** | A rating on the DUPR-like 2.0 to 6.0 scale, with an uncertainty. |
| **Estimated DUPR** | Rally's guess at a player's DUPR range from a clip (020). Not an official rating. |
| **Athleticism** | 0 to 100, from tracking: speed, distance per minute, ready position (020). |
| **Session** | A time block at a facility (e.g. Tuesday 7pm) with a price, a skill rule and a capacity. |
| **Court assignment** | Which four players are on which court, in which two teams. |
| **Fairness score** | 0 to 100: how even and how fun a court's game should be (see 030). |
| **Offer** | A spot offered to a waitlisted player after a cancellation, with an expiry. |

## Platform

- **Vision:** Python, forked from Pickleball-Vision, run offline on clips. Output is JSON (010).
- **App:** Next.js and TypeScript. Matching, sessions, backfill and ratings are plain TypeScript modules with unit tests (vitest).
- **AI:** Gemini (watches the clip: shot types, rally quality, a rubric-based level estimate; required), Claude (player cards, rules in plain English). Both behind interfaces with fakes in tests. These are the only outside services.
- **Payments:** none. A Pay button marks a sign-up paid. **Messages:** none. Offers appear on an on-screen fake phone; Rally sends no real texts, calls or emails.
- **Storage:** SQLite or in-memory for the hackathon. No cloud database.
