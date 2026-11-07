# Working on Rally

For any coding agent (Claude Code, Cursor, Codex) and any teammate. Rally is built spec first.

1. Read `specs/README.md`, `specs/000-overview.md`, and the rules at the top of `product/BUILD.md` before writing code.
2. Work on the first unticked step in `product/BUILD.md`, or the step you were asked for. Read every spec that step names. Do one step at a time. Code goes on a branch named after the step (`build/1.1-matching`), never on `main`.
3. Build what the spec says. Every acceptance criterion in scope gets a test whose name starts with its ID (`it("MATCH-3 ...")` or `def test_VIS_2_...`). If something is ambiguous, pick the simplest reading, write it in `product/DECISIONS.md`, and keep going. Don't edit specs unless you were asked to.
4. Done means the tests and type checks for what you touched pass (see `product/README.md`), the box is ticked, a line is added to the log at the bottom of `BUILD.md`, and the work is committed with the step and criteria in the message.
5. **What needs a PR.** Code (anything in `product/`) goes through a PR to `main`. The only reason is to catch merge conflicts between the two of us working at the same time, so keep PRs small and merge them as soon as they're green; no formal review needed. Second-brain updates (`idea/`, `research/`, `meeting-recordings/`, `specs/`, `demo/`, `brand-assets/`, the root READMEs, `AGENTS.md`, and `product/DECISIONS.md` or the log in `product/BUILD.md`) don't need a PR: pull, commit straight to `main`, push right away.
6. Never put real API keys, real phone numbers or real card numbers in the repo. Use `.env.local` (gitignored). Tests never call real outside services (Gemini, Claude); they use fakes.
7. No real messaging. Rally never sends a real text, call or email; offers show up on an on-screen fake phone. Don't add Twilio or anything like it. Same for payments: no Stripe, paying is a simulated button.
8. Never commit video. Demo clips are public YouTube rec-play videos: link to them in `demo/clips.md`, keep any local copies in `demo/clips/` (gitignored), and credit the channel on screen.
9. The second brain is shared memory. When you learn something the team should keep (a repo that didn't work, a number for the pitch, a judge's question), add it to the right file in `research/` or `idea/`, not just the chat. Meeting notes go in `meeting-recordings/` as `YYYY-MM-DD-topic-summary.md`.
10. Hackathon rule: a working demo beats a complete feature. If a step is taking too long, check `product/BUILD.md` "Cut list" before going deeper.
