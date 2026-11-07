# Rally design study

Review `/player/themes/courtline`, `/player/themes/matchpoint`,
`/player/themes/baseline`, and `/player/themes/overtime`. All four are responsive, interactive visual prototypes
with sample data. Switching screens, balancing, backfill, and joining only update
local preview state; these pages do not call application services.

The previews reuse `@rally/ui` buttons and icons with locally scoped theme tokens.
They do not change the global theme. Selecting a direction is a separate rollout.

## Fonts

Self-hosted Latin subsets downloaded from Google Fonts. Original font names are
preserved in the files. SIL Open Font License texts are included alongside them.

- Mona Sans: https://fonts.google.com/specimen/Mona+Sans
- Barlow Condensed: https://fonts.google.com/specimen/Barlow+Condensed
- Space Grotesk: https://fonts.google.com/specimen/Space+Grotesk
- IBM Plex Mono: https://fonts.google.com/specimen/IBM+Plex+Mono
- Anton: https://fonts.google.com/specimen/Anton

## Overtime reference

The fourth direction takes its oversized Anton headings, tight tracking, and
bracketed captions from https://www.graphichunters.com/. Browser inspection
confirmed that site's large section headings use Anton at weight 400, line-height
0.9, and letter-spacing -0.04em. Overtime uses the same open font, with Mona Sans
for the app UI. Its other commercial fonts and artwork are not included.

## Photography credit

`rec-play.jpg` is a still at source time 0:08 from
https://www.youtube.com/watch?v=f5WajWaVLfM, uploaded by
**RallyPoint by Suffolk Pickleball Co.** Credit is also linked on screen.
The video itself is not included in this branch.
