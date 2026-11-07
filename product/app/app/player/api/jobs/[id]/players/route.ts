// AI lane (Jake). GET ?t=: the players on that frame, so you can click yourself (025 step 2, VIS-9).
import { findPlayers } from "../../../../jobs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = Number(new URL(req.url).searchParams.get("t") ?? "2");
  try {
    const found = await findPlayers(id, Number.isFinite(t) ? t : 2);
    return Response.json(found, { status: found.error ? 422 : 200 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't look at that frame" }, { status: 500 });
  }
}
