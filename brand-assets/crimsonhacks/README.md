> Archived original artifact. Rally now uses [Overtime](../overtime/README.md).
> This book is historical reference; do not apply its palette or font rules to new screens.

crimsonhacks is red, white and loud: a pickleball identity built on uppercase sans headlines broken by thin serif accent words, a single crimson that does all the shouting, and the hole pattern of a pickleball as its only texture. Keep pages sparse and oversized. One idea per screen, said big.

## Voice

- Short declaratives, set in caps: "ALWAYS BRINGING THE RALLY." "ON COURT." "OFF COURT."
- Speak the sport's own words: kitchen, dink, third-shot drop, erne, DUPR, rally scoring, "games to 11, win by 2". Don't explain them.
- First person plural for the team ("we"), second person for players ("your next partner").
- Captions are PLACE, YEAR: "PROVO, 2026". Buttons start with a verb: "Book a court", "Find a partner".
- No emoji, no exclamation marks. The type carries the energy.

## Colour

- Ground is `surface`, a white with a slight red bias. Body text is `ink`; secondary text `ink-muted`; captions and years `ink-faint`.
- `crimson` is the one brand colour. Use it as a fill (primary Button, tag bars, FooterPanel frame, paddle faces) with `on-crimson` text. Hover it to `crimson-deep`.
- When red is the text itself (serif accent words, link hover), use `crimson-text`, which is tuned per theme to stay above 4.5:1.
- Alternate light sections with night sections. Wrap a section in `.ch-night` (or `Perforation tone="night"`) and every token inside remaps to the `night-*` set, in either theme. A page runs roughly: light hero, night manifesto with Marquee, light collage, night footer.
- Never introduce a second hue. Pickleball optic yellow, court blue and green are off-palette.

## Type

- Two faces. Mona Sans (Google Fonts, variable, width set to 93%) for everything; Italiana (Google Fonts) only for accent words. `components/bundle.css` loads both.
- Headlines are uppercase sans at 700 with tight leading (`impact` 132px/0.83, `h2` 72px, `h1` 64px). `h2` is deliberately larger than `h1`.
- Inside a headline, swap one to three words into the serif in `crimson-text` (`serif-impact`, `serif-h2`). Use the `Headline` component's `parts` for this.
- Pull quotes use `serif-quote`: sentence case, 0.06em tracking, `ink-muted`, signed with a small mark.
- Body copy is `body-lg` (20/25) on marketing pages and `body` (16/22) in UI. Labels are `label` (14.4/18, 600).

## Texture, shapes and imagery

- The only texture is `Perforation`: offset rings in `perforation`, low contrast, on full-width sections only.
- The only ornament is the crimson tag bar (`size-tagbar-w` × `size-tagbar-h`) above captions.
- Photos: candid players, mid-rally, sweat and grip tape, never stock handshakes. Scatter `PhotoCard`s at different widths and offsets like a contact sheet, alternating colour and mono.
- The hall of fame shows paddles as flat silhouettes (`PaddleTile`), not photos.

## Layout and spacing

- Side gutter `space-container` (20px). Gaps step `space-mini` 16, `space-small` 32, `space-med` 48, `space-large` 64, `space-xlarge` 80 between full sections.
- Fixed nav: `Wordmark` top-left, light Store `Button` and `MenuButton` top-right, both `size-control` (48px) tall. Content clears it with `space-nav`.
- Centre manifesto headlines; left-align everything else.

## Radii, borders, depth

- `radius-btn` (8.64px) on buttons only. `radius-small` on tiles and the footer tab, `radius-med` on the footer panel. Photos and the EventCard stay square.
- No shadows. Separate with ground changes (light to night) or a `line` hairline. Outlines that carry meaning use `line-strong`.
- Focus: a 2px solid `focus` ring, 3px offset, on every interactive element.

## Motion

- One moving piece per page: the `Marquee`. Hovers are 0.2s colour fades. Everything stops under `prefers-reduced-motion`.

## Iconography

- Line icons on a 24px grid, 1.6 stroke, round caps, `currentColor`, via `Icon`: paddle, ball, court, arrow, bag, trophy. Draw new ones to the same grid and stroke.
- There is no logo file. The `Wordmark` component (stacked serif CRIMSON over sans HACKS) is the mark.
