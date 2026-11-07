// AI lane (Jake). GET: a job's status, with the result once Gemini is done (025 ONB-2).
import { readStatus } from "../../../jobs";
import { uploadResult } from "../../../results";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = readStatus(id);
  if (!status) return Response.json({ error: "No such upload" }, { status: 404 });
  if (status.stage === "done") {
    const result = await uploadResult(id);
    return Response.json({ ...status, result });
  }
  return Response.json(status);
}
