# Product

The code. Built step by step from `BUILD.md`, following the specs in `../specs/`.

## Planned layout

| Path | What |
| --- | --- |
| `app/` | Next.js app: player onboarding, facility dashboard, on-screen fake phone |
| `packages/matching/` | 030, TypeScript |
| `packages/sessions/` | 040, TypeScript |
| `packages/backfill/` | 050, TypeScript |
| `packages/profiles/` | 020, TypeScript |
| `packages/ratings/` | 060, TypeScript |
| `packages/fakes/` | In-memory fakes for Claude and Gemini, used by tests |
| `vision/` | 010, Python, our fork of Pickleball-Vision |
| `fixtures/` | The demo roster, cached clip stats |

Step 0.1 in `BUILD.md` creates this layout. Until then this file is the plan.

## Running checks

- TypeScript: `npm test` and `npx tsc --noEmit` from `product/`.
- Python: `pytest` from `product/vision/`.

## Secrets

Copy `.env.example` to `.env.local` and fill it in. Never commit keys.
