// AI lane (Jake). POST { t, box }: you picked yourself; start tracking and Gemini (025 ONB-2).
import { readStatus, startAnalysis } from "../../../../jobs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { t?: unknown; box?: unknown } | null;
  const t = Number(body?.t);
  const box = Array.isArray(body?.box) ? body.box.map(Number) : [];
  if (!Number.isFinite(t) || box.length !== 4 || box.some((v: number) => !Number.isFinite(v) || v < 0 || v > 1)) {
    return Response.json({ error: "Pick a player first." }, { status: 400 });
  }
  if (!readStatus(id)) return Response.json({ error: "No such upload" }, { status: 404 });
  startAnalysis(id, t, box);
  return Response.json(readStatus(id));
}
