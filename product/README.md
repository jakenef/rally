# Product

The code. Built step by step from `BUILD.md`, following the specs in `../specs/`.

## Layout

Each path belongs to a lane (`specs/README.md`, Lanes).

| Path | What |
| --- | --- |
| `app/` | Next.js app. `app/app/player/` is the AI lane's screen; `app/app/dashboard/` and `app/app/phone/` are the Facility lane's |
| `packages/matching/` | 030, TypeScript |
| `packages/sessions/` | 040, TypeScript |
| `packages/backfill/` | 050, TypeScript |
| `packages/profiles/` | 020, TypeScript |
| `packages/ratings/` | 060, TypeScript |
| `packages/types/` | Shared types from the specs: the contract between lanes |
| `packages/fakes/` | In-memory fakes for Claude and Gemini, used by tests |
| `packages/ui/` | The crimsonhacks design system: tokens as CSS variables and React components |
| `vision/` | 010, Python, our fork of Pickleball-Vision |
| `fixtures/` | `roster.json` (shared), `sample-stats.json`, and `clips/` for cached clip results (AI lane) |

## Running it

From `product/`:

```sh
npm install
npm run dev          # the app at http://localhost:3000
npm test             # vitest: packages and fixtures
npm run typecheck    # packages and the app
npm run tokens       # regenerate packages/ui/styles/tokens.css after re-copying the design system
```

Python (AI lane), from `product/vision/`: see `vision/README.md`.

Workspace packages are TypeScript source with no build step; the app compiles them (`transpilePackages` in `app/next.config.ts`). Each lane's package exports its spec's functions as stubs that throw until its BUILD step is done, so the other lane can import them now.

## Secrets

Copy `.env.example` to `.env` (or `.env.local`) in `product/` and fill it in. Both are gitignored, and both the app and the vision pipeline read them. Never commit keys.
