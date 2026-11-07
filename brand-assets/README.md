# Brand assets

Rally uses the **crimsonhacks** design system. The source of truth is Jake's design system artifact, [crimsonhacks](https://claude.ai/artifact/HFPTXMktfVdCmGHA5jpQ9v) (private to Jake). `crimsonhacks/` is a copy of its files, taken 2026-11-07:

- `crimsonhacks/README.md`: the brand book (voice, colour, type, texture, layout, motion, icons). **Read this before building any screen.**
- `crimsonhacks/tokens.json`: every colour, type style, spacing step, radius and size, with usage notes.
- `crimsonhacks/components/`: the original React components (`bundle.js`, `bundle.css`, `index.d.ts`) and a README per component.

The app doesn't load `bundle.js`. It uses a TypeScript port in `product/packages/ui` (tokens as CSS variables plus the components we need). If the design system changes, re-copy these files and update the port.

## Quick rules for Rally screens

- One brand colour: `crimson`. No second hue (no optic yellow, no court blue or green).
- Headlines are uppercase Mona Sans; swap one to three words into the Italiana serif in `crimson-text`.
- Alternate light sections and night sections (`.ch-night`).
- No emoji, no exclamation marks, no shadows. Buttons start with a verb.
- Keep it free of BYU and Utah logos and marks; colours and words only.
