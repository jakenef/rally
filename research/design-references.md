# Rally interface references

## GraphicHunters — 2026-11-06

Source: https://www.graphichunters.com/ (design credited to Somefolk; development
credited to Code by Dennis). Jake requested screenshots and a fourth Rally theme
using this site's font style.

Browser inspection of computed styles found:

- **Anton, 400:** oversized uppercase section headings. At a 1440px viewport,
  the studio heading was 197px with 177.3px leading and -7.88px letter spacing;
  the projects heading was 256px with 230.4px leading and -10.24px tracking.
- **Neue Haas Grotesk Display Pro, 400/500:** neutral navigation and body text.
- **Denton Condensed, 400:** serif supporting phrases.
- **Plaid S Mono, 400:** bracketed metadata.
- **Bolgarus Beta, 400:** wide display branding.

Useful direction: make the large athletic sans typography carry the identity,
keep supporting text quiet, use tight line-height/tracking and bracketed labels.
For Rally's Overtime preview, use Anton (SIL OFL, self-hosted) plus existing Mona
Sans and IBM Plex Mono. Keep black/charcoal surfaces and crimson accents per
Jake's brief. Do not copy the reference's commercial font files or artwork.

Desktop, full-page, typography-section, and mobile reference screenshots were
captured locally for the design comparison. The preview and asset attribution
live in `product/app/app/player/themes/` and `product/app/public/theme-options/`.
