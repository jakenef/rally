// AI lane (Jake). The tracked player boxes for an uploaded clip.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { jobDir } from "../../../../jobs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const dir = jobDir((await params).id);
  const file = dir ? path.join(dir, "overlay.json") : null;
  if (!file || !existsSync(file)) return new Response("Not tracked yet", { status: 404 });
  return new Response(readFileSync(file), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
