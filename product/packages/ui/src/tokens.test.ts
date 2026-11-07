import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const here = (p: string) => new URL(p, import.meta.url);
const tokens = JSON.parse(readFileSync(here("../../../../brand-assets/overtime/tokens.json"), "utf8"));
const css = readFileSync(here("../styles/tokens.css"), "utf8");
const colors = Object.fromEntries(tokens.color.tokens.map((t: { name: string; value: string }) => [t.name, t.value]));
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => channels(hex).map((c) => {
  const v = c / 255;
  return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
}).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
};

describe("Overtime tokens", () => {
  it("tokens.css defines every token in tokens.json (run `npm run tokens` if this fails)", () => {
    const names = [
      ...tokens.color.tokens,
      ...tokens.spacing.tokens,
      ...tokens.radius.tokens,
      ...tokens.size.tokens,
    ].map((t: { name: string }) => t.name);
    for (const n of names) expect(css, n).toContain(`--${n}:`);
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-display:");
    expect(css).toContain("--font-accent:");
  });
  it("keeps every page ground neutral black instead of maroon", () => {
    for (const name of ["surface", "surface-raised", "surface-sunk", "night", "night-raised"]) {
      const [r, g, b] = channels(colors[name]);
      expect(r, name).toBe(g);
      expect(g, name).toBe(b);
      expect(r, name).toBeLessThanOrEqual(24);
    }
    expect(css).toContain("color-scheme: dark;");
    expect(css).not.toContain("prefers-color-scheme");
  });
  it("keeps text readable on both dark surfaces and primary actions", () => {
    for (const ground of ["surface", "surface-raised"]) {
      for (const ink of ["ink", "ink-muted", "ink-faint", "crimson-text"]) {
        expect(contrast(colors[ink], colors[ground]), `${ink} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(colors["on-crimson"], colors.crimson)).toBeGreaterThanOrEqual(4.5);
  });
});
