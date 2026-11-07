# @rally/ui

The shared Overtime design system. Read
[`brand-assets/overtime/README.md`](../../../brand-assets/overtime/README.md).

Import `@rally/ui/tokens.css` then `@rally/ui/components.css` once in the root
layout. Fonts are bundled in the stylesheet; no external font service is needed.
Use `Button`, `Headline`, `Logo`, `Perforation`, and `Marquee` from `@rally/ui`.
`Logo` renders the canonical supplied artwork at `/brand/rally-logo.png`;
`Wordmark` is a compatibility alias to it.

```tsx
<Logo />
<Headline parts={["Balanced games, not", { text: "court time.", accent: true }]} />
<Marquee rows={[
  { text: "Same rating, different game." },
  { text: "Mirror the teams.", accent: true },
]} />
```

Edit tokens in `brand-assets/overtime/tokens.json`, then run `npm run tokens`
from `product/`. `styles/tokens.css` is generated. `ch-*` classes and older
`serif` props remain compatibility aliases for screens being built in both lanes.
Neither alias enables the archived palette or old font.

Crimson is the default accent for headlines, ratings, marquee text, primary
actions, and data marks. Only the main video-rating heading opts into black fill
with a `#F5F5F5` outline using `<Headline className="ch-hl-outline" ... />`.
Small accent text and focus rings are white. Do not outline the marquee or
rating numbers.
