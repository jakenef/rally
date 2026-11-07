// Generates the active Overtime design tokens. Run with `npm run tokens`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const tokens = JSON.parse(readFileSync(root + "brand-assets/overtime/tokens.json", "utf8"));
const theme = tokens.color.themes[0].id;

const value = (v, theme) => {
  const raw = typeof v === "string" ? v : v[theme];
  return raw.replace(/^\{(.+)\}$/, "var(--$1)");
};
const colorLines = (theme, onlyThemed) =>
  tokens.color.tokens
    .filter((t) => !onlyThemed || typeof t.value !== "string")
    .map((t) => `  --${t.name}: ${value(t.value, theme)};`)
    .join("\n");
const plain = ["spacing", "radius", "size"].flatMap((f) => tokens[f].tokens.map((t) => `  --${t.name}: ${t.value};`));
const fonts = Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`);

const css = `/* ${tokens.name}: generated from brand-assets/overtime/tokens.json by scripts/build-tokens.mjs. Don't edit by hand. */
:root {
${colorLines(theme, false)}
${fonts.join("\n")}
${plain.join("\n")}
  color-scheme: ${theme};
}
`;
writeFileSync(root + "product/packages/ui/styles/tokens.css", css);
console.log("wrote packages/ui/styles/tokens.css");
