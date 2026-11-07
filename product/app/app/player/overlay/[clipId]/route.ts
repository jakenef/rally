// AI lane (Jake). The tracked player boxes for one clip.
import { readFileSync } from "node:fs";
import { overlayPath } from "../../local";

export async function GET(_req: Request, { params }: { params: Promise<{ clipId: string }> }) {
  const file = overlayPath((await params).clipId);
  if (!file) return new Response("No overlay for this clip", { status: 404 });
  return new Response(readFileSync(file), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
