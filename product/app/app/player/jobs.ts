// AI lane (Jake). Uploaded clips (025): one folder per job in product/.uploads/<jobId>/,
// processed by the Python pipeline (rally_vision players / analyze) as subprocesses.
import "server-only";
import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const JOB_ID = /^[a-f0-9]{16}$/;

function productDir(): string {
  for (const d of [path.join(/* turbopackIgnore: true */ process.cwd(), ".."), /* turbopackIgnore: true */ process.cwd()]) {
    if (existsSync(path.join(d, "vision"))) return d;
  }
  throw new Error("Can't find the product folder");
}

const visionDir = () => path.join(productDir(), "vision");
const python = () => path.join(visionDir(), ".venv", "bin", "python");
export const uploadsDir = () => path.join(productDir(), ".uploads");

export function jobDir(jobId: string): string | null {
  if (!JOB_ID.test(jobId)) return null;
  const dir = path.join(uploadsDir(), jobId);
  return existsSync(dir) ? dir : null;
}

export function jobVideo(jobId: string): string | null {
  const dir = jobDir(jobId);
  const file = dir ? readdirSync(dir).find((f) => f.startsWith("clip.")) : undefined;
  return dir && file ? path.join(dir, file) : null;
}

export type Step = { name: string; state: "waiting" | "running" | "done" | "failed"; detail?: string };
export type RawStatus = { stage: string; steps?: Step[]; error?: string | null; durationSec?: number };

export function readStatus(jobId: string): RawStatus | null {
  const dir = jobDir(jobId);
  if (!dir) return null;
  try {
    return JSON.parse(readFileSync(path.join(dir, "status.json"), "utf8"));
  } catch {
    return { stage: "uploaded" };
  }
}

/** Save an uploaded file as a new job (ONB-1). */
export async function createJob(file: File): Promise<string> {
  const id = randomBytes(8).toString("hex");
  const dir = path.join(uploadsDir(), id);
  mkdirSync(dir, { recursive: true });
  const ext = (path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4").slice(0, 6);
  writeFileSync(path.join(dir, `clip${ext}`), Buffer.from(await file.arrayBuffer()));
  writeFileSync(path.join(dir, "status.json"), JSON.stringify({ stage: "pick", name: file.name }));
  return id;
}

export type Players = { t: number; boxes: [number, number, number, number][]; durationSec: number; error?: string };

/** People on the frame at t (VIS-9), via the Python pipeline. */
export async function findPlayers(jobId: string, t: number): Promise<Players> {
  const video = jobVideo(jobId);
  if (!video) throw new Error("No such upload");
  try {
    const { stdout } = await run(python(), ["-m", "rally_vision", "players", video, "--t", String(Math.max(0, t))], {
      cwd: visionDir(),
      timeout: 60_000,
    });
    return JSON.parse(stdout.trim().split("\n").pop()!);
  } catch (e) {
    const out = (e as { stdout?: string }).stdout?.trim().split("\n").pop();
    if (out?.startsWith("{")) return JSON.parse(out);
    throw e;
  }
}

/** Start tracking and Gemini for the picked player (ONB-2), detached; progress lands in status.json. */
export function startAnalysis(jobId: string, t: number, box: number[]): void {
  const dir = jobDir(jobId);
  if (!dir) throw new Error("No such upload");
  writeFileSync(
    path.join(dir, "status.json"),
    JSON.stringify({
      stage: "analyzing",
      steps: [
        { name: "Tracking the players", state: "running", detail: "Starting" },
        { name: "Gemini is watching you play", state: "running", detail: "Starting" },
      ],
    }),
  );
  const log = openSync(path.join(dir, "analyze.log"), "a");
  const child = spawn(python(), ["-u", "-m", "rally_vision", "analyze", dir, "--t", String(t), "--box", box.map((v) => v.toFixed(4)).join(",")], {
    cwd: visionDir(),
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
}
