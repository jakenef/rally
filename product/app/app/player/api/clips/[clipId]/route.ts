// AI lane (Jake). A prepared clip's saved analysis, for the demo controls (025 ONB-5). Never calls Gemini.
import { clipResult } from "../../../results";

export async function GET(_req: Request, { params }: { params: Promise<{ clipId: string }> }) {
  const result = await clipResult((await params).clipId);
  return result ? Response.json(result) : Response.json({ error: "No such clip" }, { status: 404 });
}
