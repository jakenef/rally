// AI lane (Jake). The uploaded clip itself.
import { jobVideo } from "../../../../jobs";
import { streamVideo } from "../../../../video-stream";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const file = jobVideo((await params).id);
  return file ? streamVideo(req, file) : new Response("No such upload", { status: 404 });
}
