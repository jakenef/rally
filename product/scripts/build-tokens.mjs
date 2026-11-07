// Turns brand-assets/crimsonhacks/tokens.json into packages/ui/styles/tokens.css.
// Run with `npm run tokens` after re-copying the design system.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const tokens = JSON.parse(readFileSync(root + "brand-assets/crimsonhacks/tokens.json", "utf8"));
const [light, dark] = tokens.color.themes.map((t) => t.id);

const value = (v, theme) => {
  const raw = typeof v === "string" ? v : v[theme] ?? v[light];
  return raw.replace(/^\{(.+)\}$/, "var(--$1)");
};
const colorLines = (theme, onlyThemed) =>
  tokens.color.tokens
    .filter((t) => !onlyThemed || typeof t.value !== "string")
    .map((t) => `  --${t.name}: ${value(t.value, theme)};`)
    .join("\n");
const plain = ["spacing", "radius", "size"].flatMap((f) => tokens[f].tokens.map((t) => `  --${t.name}: ${t.value};`));
const fonts = Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`);

const css = `/* ${tokens.name}: generated from brand-assets/crimsonhacks/tokens.json by scripts/build-tokens.mjs. Don't edit by hand. */
:root {
${colorLines(light, false)}
${fonts.join("\n")}
${plain.join("\n")}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${colorLines(dark, true).replace(/^/gm, "  ")}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${colorLines(dark, true)}
  color-scheme: dark;
}
`;
writeFileSync(root + "product/packages/ui/styles/tokens.css", css);
console.log("wrote packages/ui/styles/tokens.css");
