// AI lane (Jake). Streams a local clip with HTTP range support, so the <video> element can seek.
import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { localVideoPath } from "../../local";

export async function GET(req: Request, { params }: { params: Promise<{ clipId: string }> }) {
  const file = localVideoPath((await params).clipId);
  if (!file) return new Response("No local copy of this clip", { status: 404 });
  const size = statSync(file).size;
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  const headers = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
  if (!range) {
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...headers, "Content-Length": String(size) } });
  }
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : Math.min(start + 4_000_000, size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
    status: 206,
    headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
  });
}
