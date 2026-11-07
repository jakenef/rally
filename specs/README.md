# Specs

Rally is built spec first. Every module has one spec here, and the code does what the spec says.

## Rules

1. **Spec before code.** A behavior change starts by editing a spec. Code comes after and references the criteria it satisfies.
2. **Numbered acceptance criteria.** Each criterion has an ID like `MATCH-3`. Each ID has at least one test whose name starts with that ID, so `grep MATCH-3` finds both.
3. **Modules talk through their interface only.** The interface section of a spec is the contract.
4. **Non-goals are binding.** If it's a non-goal, don't build it at the hackathon, even if it's easy.
5. **Open questions block nothing.** Each one has a default we build until it's answered.

New spec: copy `_template.md`, pick the next free number, add it to the map below.

## Lanes

Two people build Rally at the same time, so every module belongs to one lane. **Agents stay in their lane:** only change files your lane owns. If you need something changed in another lane's files, or in a shared file, write it down in `product/DECISIONS.md` under "Asks" and tell your person; don't make the change yourself.

| Lane | Owner | What it covers | Specs | Owns these paths |
| --- | --- | --- | --- | --- |
| **AI** | Jake | Video to player: vision pipeline, Gemini, estimated DUPR, athleticism, player cards, the get-your-rating flow | 010, 020, 025 | `product/vision/`, `product/packages/profiles/`, `product/app/app/player/`, `product/fixtures/clips/`, `demo/clips.md` |
| **Facility** | Danny | Courts and money: matching, sessions, backfill, ratings, dashboard, fake phone | 030, 040, 050, 060 | `product/packages/matching/`, `product/packages/sessions/`, `product/packages/backfill/`, `product/packages/ratings/`, `product/app/app/dashboard/`, `product/app/app/phone/` |

**Shared (change only after telling the other person):** `product/packages/types/` (the contract between lanes), `product/packages/fakes/`, `product/packages/ui/` (the design system port), `product/fixtures/roster.json`, `product/app/app/layout.tsx` and the home page, `product/package.json`, `product/tsconfig*.json`.

**Where the lanes meet:**
- AI → Facility: the player screen calls `signUp()` from `sessions` with a `Profile`.
- Facility → AI: none. The facility lane only reads `Profile`s; it never calls Gemini or the vision pipeline.

Until a lane's real module exists, the other lane uses the fixtures (`roster.json` for profiles, `sample-stats.json` for clip stats).

## Module map

| Spec | Module | Prefix | Step | Lane |
| --- | --- | --- | --- | --- |
| [000](000-overview.md) | Overview, glossary, data flow | | | |
| [010](010-vision.md) | `vision`: clip in, per-player stats out | `VIS` | 2.1 | AI |
| [020](020-profiles.md) | `profiles`: style profile, skill range, player card | `PRO` | 2.2 | AI |
| [025](025-onboarding.md) | `onboarding`: upload your clip, pick yourself, get your rating | `ONB` | 2.3 | AI |
| [030](030-matching.md) | `matching`: courts and teams, fairness score | `MATCH` | 1.1 | Facility |
| [040](040-sessions.md) | `sessions`: sessions, sign-ups, pricing rules, payment | `SESS` | 1.2 | Facility |
| [050](050-backfill.md) | `backfill`: cancellations, ranked waitlist, offers | `FILL` | 1.3 | Facility |
| [060](060-ratings.md) | `ratings`: OpenSkill updates after games | `RATE` | 3.1 | Facility |

## Data flow

```
clip ─> vision (Python) ─> stats JSON ─> profiles ─> player
                                                       │
facility rules ─> sessions <─ sign-ups <───────────────┘
                     │
                     ├─> matching ─> courts + fairness
                     ├─> backfill ─> offer ─> payment
                     └─> results ─> ratings ─> profiles
```
