# Working on Rally

For any coding agent (Claude Code, Cursor, Codex) and any teammate. Rally is built spec first.

1. Read `specs/README.md`, `specs/000-overview.md`, and the rules at the top of `product/BUILD.md` before writing code.
2. Work on the first unticked step in `product/BUILD.md`, or the step you were asked for. Read every spec that step names. Do one step at a time, on a branch named after it (`build/1.1-matching`), never on `main`.
3. Build what the spec says. Every acceptance criterion in scope gets a test whose name starts with its ID (`it("MATCH-3 ...")` or `def test_VIS_2_...`). If something is ambiguous, pick the simplest reading, write it in `product/DECISIONS.md`, and keep going. Don't edit specs unless you were asked to.
4. Done means the tests and type checks for what you touched pass (see `product/README.md`), the box is ticked, a line is added to the log at the bottom of `BUILD.md`, and the work is committed with the step and criteria in the message. Open a PR to `main`; don't push to `main` directly.
5. Never put real API keys, real phone numbers or real card numbers in the repo. Use `.env.local` (gitignored) and Stripe test mode. Tests never call real outside services (Gemini, Claude, Twilio, Stripe); they use fakes.
6. Never commit video. Demo clips live in `demo/clips/` and are gitignored. Never commit footage of people who didn't agree to it.
7. The second brain is shared memory. When you learn something the team should keep (a repo that didn't work, a number for the pitch, a judge's question), add it to the right file in `research/` or `idea/`, not just the chat. Meeting notes go in `meeting-recordings/` as `YYYY-MM-DD-topic-summary.md`.
8. Hackathon rule: a working demo beats a complete feature. If a step is taking too long, check `product/BUILD.md` "Cut list" before going deeper.
