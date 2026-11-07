// AI lane (Jake). Streams a prepared clip's local copy (demo/clips/), with range support.
import { localVideoPath } from "../../local";
import { streamVideo } from "../../video-stream";

export async function GET(req: Request, { params }: { params: Promise<{ clipId: string }> }) {
  const file = localVideoPath((await params).clipId);
  return file ? streamVideo(req, file) : new Response("No local copy of this clip", { status: 404 });
}
