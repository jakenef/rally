# Specs

Rally is built spec first. Every module has one spec here, and the code does what the spec says.

## Rules

1. **Spec before code.** A behavior change starts by editing a spec. Code comes after and references the criteria it satisfies.
2. **Numbered acceptance criteria.** Each criterion has an ID like `MATCH-3`. Each ID has at least one test whose name starts with that ID, so `grep MATCH-3` finds both.
3. **Modules talk through their interface only.** The interface section of a spec is the contract.
4. **Non-goals are binding.** If it's a non-goal, don't build it at the hackathon, even if it's easy.
5. **Open questions block nothing.** Each one has a default we build until it's answered.

New spec: copy `_template.md`, pick the next free number, add it to the map below.

## Module map

| Spec | Module | Prefix | Step |
| --- | --- | --- | --- |
| [000](000-overview.md) | Overview, glossary, data flow | | |
| [010](010-vision.md) | `vision`: clip in, per-player stats out | `VIS` | 2.1 |
| [020](020-profiles.md) | `profiles`: style profile, skill range, player card | `PRO` | 2.2 |
| [030](030-matching.md) | `matching`: courts and teams, fairness score | `MATCH` | 1.2 |
| [040](040-sessions.md) | `sessions`: sessions, sign-ups, pricing rules, payment | `SESS` | 1.3 |
| [050](050-backfill.md) | `backfill`: cancellations, ranked waitlist, offers | `FILL` | 1.4 |
| [060](060-ratings.md) | `ratings`: OpenSkill updates after games | `RATE` | 3.1 |

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
