# Working on Rally

For any coding agent (Claude Code, Cursor, Codex) and any teammate. Rally is built spec first.

## This is a hackathon proof of concept

Rally is a hackathon project, not a business. The only goal is a demo that works on stage and shows the idea. So:

- **Fake anything the demo doesn't need to be real.** No payments, no messaging, no booking-software or DUPR integration, no sign-in, no real database. Hardcoded data, JSON fixtures and buttons that just flip a status are the right answer.
- **The real parts are the ones judges see:** the video pipeline (open-source vision plus Gemini), the estimated DUPR and player card (Claude), and the matching engine. Spend the effort there.
- **No production concerns:** no auth, scaling, security hardening, edge cases nobody will click, or migrations. If a spec seems to ask for that, pick the simplest reading and note it in `product/DECISIONS.md`.
- **Tests are for the logic we show** (matching, profiles, backfill ranking), to keep it from breaking mid-demo. Not for coverage.

## Rules

1. Read `specs/README.md`, `specs/000-overview.md`, and the rules at the top of `product/BUILD.md` before writing code.
2. **Stay in your lane.** Find out which lane you're working for (ask if unsure): **AI** (Jake) or **Facility** (Danny). Only change the files that lane owns (`specs/README.md`, Lanes). Shared files (types, fakes, ui, roster, app layout, package.json) change only after the other person is told. Need something from the other lane? Write it under "Asks" in `product/DECISIONS.md`.
3. Work on the first unticked step in your lane in `product/BUILD.md`, or the step you were asked for. Read every spec that step names. Do one step at a time. Code goes on a branch named after the step (`build/1.1-matching`), never on `main`.
4. Build what the spec says. Every acceptance criterion in scope gets a test whose name starts with its ID (`it("MATCH-3 ...")` or `def test_VIS_2_...`). If something is ambiguous, pick the simplest reading, write it in `product/DECISIONS.md`, and keep going. Don't edit specs unless you were asked to.
5. Done means the tests and type checks for what you touched pass (see `product/README.md`), the box is ticked, a line is added to the log at the bottom of `BUILD.md`, and the work is committed with the step and criteria in the message.
6. **What needs a PR.** Code (anything in `product/`) goes through a PR to `main`. The only reason is to catch merge conflicts between the two of us working at the same time, so keep PRs small and merge them as soon as they're green; no formal review needed. Second-brain updates (`idea/`, `research/`, `meeting-recordings/`, `specs/`, `demo/`, `brand-assets/`, the root READMEs, `AGENTS.md`, and `product/DECISIONS.md` or the log in `product/BUILD.md`) don't need a PR: pull, commit straight to `main`, push right away.
7. Never put the Claude or Gemini API keys in the repo. Use `.env.local` (gitignored). Tests never call real outside services (Gemini, Claude); they use fakes.
8. Claude and Gemini are the only outside services. No messaging (offers show on an on-screen fake phone), no payments (a Pay button flips a status), nothing else.
9. Never commit video. Demo clips are public YouTube rec-play videos: link to them in `demo/clips.md`, keep any local copies in `demo/clips/` (gitignored), and credit the channel on screen.
10. **Design:** every screen uses the Overtime design system through `product/packages/ui`. Read `brand-assets/README.md` and `brand-assets/overtime/README.md` before building a screen. Black/charcoal grounds, crimson accents, Anton headings, Mona Sans UI. Keep copy minimal; preserve the homepage pickleball pattern and opposing two-font marquee. Don't add decorative captions or alternate themes. The original crimsonhacks artifact is archived.
11. The second brain is shared memory. When you learn something the team should keep (a repo that didn't work, a number for the pitch, a judge's question), add it to the right file in `research/` or `idea/`, not just the chat. Meeting notes go in `meeting-recordings/` as `YYYY-MM-DD-topic-summary.md`.
12. Hackathon rule: a working demo beats a complete feature. If a step is taking too long, check `product/BUILD.md` "Cut list" before going deeper.
