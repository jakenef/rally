import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const here = (p: string) => new URL(p, import.meta.url);
const tokens = JSON.parse(readFileSync(here("../../../../brand-assets/crimsonhacks/tokens.json"), "utf8"));
const css = readFileSync(here("../styles/tokens.css"), "utf8");

describe("crimsonhacks tokens", () => {
  it("tokens.css defines every token in tokens.json (run `npm run tokens` if this fails)", () => {
    const names = [
      ...tokens.color.tokens,
      ...tokens.spacing.tokens,
      ...tokens.radius.tokens,
      ...tokens.size.tokens,
    ].map((t: { name: string }) => t.name);
    for (const n of names) expect(css, n).toContain(`--${n}:`);
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-serif:");
  });
});
