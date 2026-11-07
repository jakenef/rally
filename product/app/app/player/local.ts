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

/** The local copy in demo/clips/: any .mp4 whose name contains the clip ID (e.g. clip-06-wise-pickleball-4.5-RijUJWIBe_o.mp4). */
export function localVideoPath(clipId: string): string | null {
  const product = productDir();
  if (!product || !SAFE_ID.test(clipId)) return null;
  const dir = path.join(product, "..", "demo", "clips");
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => f.endsWith(".mp4") && f.includes(clipId));
  return file ? path.join(dir, file) : null;
}

/** fixtures/clips/<clipId>.overlay.json, if tracking has run. */
export function overlayPath(clipId: string): string | null {
  const product = productDir();
  if (!product || !SAFE_ID.test(clipId)) return null;
  const file = path.join(product, "fixtures", "clips", `${clipId}.overlay.json`);
  return existsSync(file) ? file : null;
}
