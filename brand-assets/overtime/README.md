# Overtime

Rally's active visual language. Black, crimson accents, occasional white outlines, athletic type, useful information.
The name belongs in the design docs, not in the app's navigation or marketing copy.

## Source of truth

- `tokens.json`: colors, type families and styles, spacing, radii, control sizes.
- `product/scripts/build-tokens.mjs`: generates `packages/ui/styles/tokens.css`.
- `product/packages/ui/src/index.tsx`: shared components for both lanes.
- `product/packages/ui/styles/components.css`: shared typography and components.
- `product/packages/ui/styles/fonts/`: self-hosted Anton and Mona Sans with OFL licenses.
- `product/app/public/brand/rally-logo.png`: canonical user-supplied logo artwork, preserved unchanged.

Update source tokens and run `npm run tokens` from `product/`. Colors and fonts
come from `@rally/ui`; screens only add layout. The old `ch-*` class prefix is
retained for compatibility and does not indicate an alternate design system.

## Color

Always start with `surface` (#080808), including when the OS prefers light mode.
Use neutral charcoal for cards and wells. No brown, maroon, pink-tinted grounds,
light sections, gradients, or shadows. Separate areas with hairlines and spacing.

`crimson` (#E5112D) is the default accent for headings, prominent ratings,
primary actions, data marks, and the opposing Mona Sans marquee. The homepage's
"court time." stays solid crimson. Do not outline the marquee or rating numbers.
Text on red uses `on-crimson`.

Reserve black `accent-fill` (#080808) with an `accent-outline` (#F5F5F5) stroke
for occasional display headings. Explicitly opt in with `ch-hl-outline` on
`Headline`; currently only the main video-rating screen uses this treatment.
Use `size-accent-stroke` to scale the stroke from 1px to 2px with the type.
Browsers without text-stroke support use solid white for these opt-in accents.
Never apply the outlined style to every headline or to small text.

Small text, hover boundaries, and keyboard focus use solid white for legibility;
the legacy `crimson-text` and `night-crimson-text` tokens resolve to white.
Do not reintroduce the former pale red (#FF5267). `ch-night` remains black.

## Type

- **Anton, 400:** headings and prominent numbers. Uppercase with tight
  tracking (-0.035 to -0.04em) and close leading. Do not synthesize bold.
- **Mona Sans, 400–800:** body, navigation, controls, metadata. Use 400 for body,
  500 for labels, 600 for controls. Keep body readable and calmer than headings.
- Headlines use `Headline`; mark crimson words with `{ text: "session", accent: true }`.
- Use `className="ch-hl-outline"` only for the main video-rating heading.
- `serif` props and `--font-serif` are legacy compatibility aliases. They no
  longer load or render a serif. New code uses `accent`.

The opposing marquee rows intentionally use different typefaces: white Anton
moving left and solid crimson Mona Sans moving right. Keep the original short slogans,
"Same rating, different game." and "Mirror the teams."
The red row matches the homepage headline accent and primary action; keep its
distinct Mona Sans font and opposite direction. Do not outline the marquee text.

## Copy and composition

The homepage has one headline, one short sentence, and two actions. Preserve
"Balanced games, not court time." with the pickleball ring pattern behind it.
The only additional homepage copy is the two original marquee slogans.

App screens show a title, actual data, and useful controls. Remove scene numbers,
decorative place/year captions, workspace labels, redundant headings, and filler
such as "always in play" or "Tuesday open play." Keep source credits, prices,
confidence, estimate labels, chart explanations, and honest empty states when
they help the player understand what they are seeing.

Do not add fake activity, extra metrics, decorative player-lab panels, or a
second slogan footer. Do not put BUILD step numbers or implementation details in
the product UI. Buttons start with a verb and say what they do.

## Components and texture

### Logo

Use `Logo` from `@rally/ui` everywhere a brand mark is needed. It renders the
supplied white block RALLY / red brush-script artwork from
`/brand/rally-logo.png`. Browser and Apple touch icons use the same canonical
asset. The source PNG is preserved byte-for-byte; shared CSS crops empty margins
and blends its dark background into the site without stretching or redrawing it.
Do not recreate the mark with a font or recolor the supplied brushwork.
`Wordmark` remains a compatibility alias to `Logo`.

Use `Button`, `Headline`, `Logo`, `Icon`, `Perforation`, and `Marquee` from
`@rally/ui`. Buttons have 48px targets and minimal rounding. Cards are square or
nearly square. Use the existing line icon set and one primary action per view.

`Perforation` is the original offset pickleball-ring pattern. Keep it quiet but
visible behind the homepage title. It is the only background ornament.

## Motion and access

The two-row marquee is the only autonomous motion. Each row reverses the other.
Both stop for `prefers-reduced-motion`. Controls get visible keyboard focus.
The headline, actions, cards, and charts must work on narrow screens without
horizontal page overflow. Keep semantics and functional state unchanged when
restyling a lane's screen.

## Reference

The chosen Overtime study used GraphicHunters' oversized Anton headings:
https://www.graphichunters.com/. Rally uses the openly licensed Anton font and
its own palette, content, texture, and components. Commercial reference fonts
and artwork are not part of this system. The original `crimsonhacks/` artifact is
archived; the alternative design previews are retired.
