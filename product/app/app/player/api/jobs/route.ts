// AI lane (Jake). POST: upload a clip, start a job (025 ONB-1).
import { createJob } from "../../jobs";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a video file." }, { status: 400 });
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(file.name)) {
    return Response.json({ error: "That isn't a video file." }, { status: 400 });
  }
  return Response.json({ jobId: await createJob(file) });
}
