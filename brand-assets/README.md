# Rally design system: Overtime

**Overtime is the active system.** Read [overtime/README.md](overtime/README.md)
before changing a screen. Its source tokens are in
[overtime/tokens.json](overtime/tokens.json); shared components, CSS, and bundled
fonts live in `product/packages/ui`.

- Black by default, charcoal surfaces, crimson accents.
- Anton for display type; Mona Sans for UI and the alternate slogan row.
- Minimal copy: a clear title, relevant information, and the actions needed.
- Keep the homepage pickleball pattern and two opposing marquee rows.
- No decorative locations, dates, badges, filler slogans, or design selectors.

Run `npm run tokens` from `product/` after editing the source tokens. Do not edit
the generated CSS manually.

`crimsonhacks/` is the archived original source artifact. It is retained for
reference, especially the pickleball texture and marquee, and is not the active
palette or typography. Do not copy its bundle over the current UI package.
