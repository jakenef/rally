// AI lane (Jake). Files that only exist on the laptop that downloaded the clips:
// the local videos (demo/clips/, gitignored) and the tracking overlays (fixtures/clips/*.overlay.json).
import "server-only";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

function productDir(): string | null {
  for (const d of [path.join(/* turbopackIgnore: true */ process.cwd(), ".."), /* turbopackIgnore: true */ process.cwd()]) {
    if (existsSync(path.join(d, "vision"))) return d;
  }
  return null;
}

/** demo/clips/<clipId>_*.mp4, if this laptop has it. */
export function localVideoPath(clipId: string): string | null {
  const product = productDir();
  if (!product || !SAFE_ID.test(clipId)) return null;
  const dir = path.join(product, "..", "demo", "clips");
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => f.endsWith(".mp4") && (f === `${clipId}.mp4` || f.startsWith(`${clipId}_`)));
  return file ? path.join(dir, file) : null;
}

/** fixtures/clips/<clipId>.overlay.json, if tracking has run. */
export function overlayPath(clipId: string): string | null {
  const product = productDir();
  if (!product || !SAFE_ID.test(clipId)) return null;
  const file = path.join(product, "fixtures", "clips", `${clipId}.overlay.json`);
  return existsSync(file) ? file : null;
}
