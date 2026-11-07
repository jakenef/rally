# Build plan

Work through this list one step at a time, top to bottom (or take the step you were given). A step is done when its box is ticked, its tests pass, and it's committed in a PR.

## Rules for every step

1. **Specs are the source of truth.** Read `specs/README.md`, `specs/000-overview.md`, and the spec(s) named in the step before writing code.
2. **Tests carry criterion IDs.** Every criterion in scope gets at least one test whose name starts with its ID. A criterion that needs real video, a real phone or a real model gets a skipped test (`it.todo`) and a line in `DECISIONS.md` saying why.
3. **Ambiguity:** don't stop and don't edit the spec. Pick the simplest reading, write it in `DECISIONS.md` (`- 030 MATCH-2: ...`), and continue.
4. **Modules only use each other's exported interface.**
5. **Everything external sits behind an interface with a fake** in `packages/fakes`: Claude, Gemini, Stripe, SMS.
6. **The demo is the deadline.** Steps marked (demo) must work before anything marked (stretch).
7. **Finish a step:** checks pass (see `product/README.md`), tick the box, add one line to the log, commit with the step and criteria in the message, open a PR.

## Steps

### Step 0: Skeleton
- [ ] **0.1 Workspace.** npm workspace with the layout in `product/README.md`, strict TypeScript, vitest, `packages/fakes`. Next.js app that renders a placeholder dashboard. `vision/` with a Python package stub and pytest.
- [ ] **0.2 Demo roster.** `fixtures/roster.json`: 16 to 18 players with names, skill and style chosen so random assignment looks bad and balanced assignment looks good.

### Step 1: The engine (demo)
- [ ] **1.2 Matching** (`030`, MATCH-1 to MATCH-6).
- [ ] **1.3 Sessions** (`040`, SESS-1 to SESS-4), Stripe faked.
- [ ] **1.4 Backfill** (`050`, FILL-1 to FILL-4), SMS faked.
- [ ] **1.5 Dashboard** (demo flow B and C): tonight's courts, **Rally it** button, fairness scores, cancel button, fake phone, recovered revenue.

### Step 2: The player (demo)
- [ ] **2.1 Vision** (`010`, VIS-1 to VIS-4). Fork Pickleball-Vision, run it on our clips, cache the JSON in `fixtures/`.
- [ ] **2.2 Profiles** (`020`, PRO-1 to PRO-4) and the player card screen (demo flow A).

### Step 3: Polish (stretch)
- [ ] **3.1 Ratings** (`060`, RATE-1 to RATE-3).
- [ ] **3.2 Real Stripe test mode and Twilio test SMS.**
- [ ] **3.3 Holy War Night** (demo flow D).
- [ ] **3.4 Voice backfill call.**

## Cut list (when behind, cut in this order)

1. Voice calls (3.4)
2. Holy War Night (3.3)
3. Live clip processing on stage (use cached results)
4. Gemini shot labels (keep position and pose stats)
5. Ratings (3.1)

## Log

One line per finished step: `- YYYY-MM-DD step: what was done (criteria).`

- 2026-11-06 setup: repo laid out as the team's second brain; specs 000 to 060 drafted.
