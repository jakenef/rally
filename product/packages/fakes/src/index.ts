// In-memory fakes for the outside services, so tests and the offline demo never call Claude or Gemini.
import type { ClaudeClient, GeminiAssessment, GeminiClient } from "@rally/types";

/** Answers each request with the next canned reply, or with `fallback(request)`. */
export function fakeClaude(replies: unknown[] = [], fallback?: (req: { prompt: string; shape: string }) => unknown): ClaudeClient & {
  calls: { prompt: string; shape: string }[];
} {
  const queue = [...replies];
  const calls: { prompt: string; shape: string }[] = [];
  return {
    calls,
    async json<T>(req: { prompt: string; shape: string }): Promise<T> {
      calls.push(req);
      if (queue.length) return queue.shift() as T;
      if (fallback) return fallback(req) as T;
      throw new Error(`fakeClaude: no reply queued for shape "${req.shape}"`);
    },
  };
}

export const sampleAssessment: GeminiAssessment = {
  shots: { dink: 14, drive: 3, drop: 4, lob: 0, volley: 6, serve: 2, return: 2 },
  thirdShotDropShare: 0.75,
  unforcedErrors: 2,
  resetsUnderPressure: 3,
  levelEstimate: { low: 3.5, high: 4.0 },
  reasons: ["Gets to the kitchen line after every return", "Drops three of four third shots", "Resets hard drives softly into the kitchen"],
};

/** Answers every clip with `assessment` and records what it was asked. */
export function fakeGemini(assessment: GeminiAssessment = sampleAssessment): GeminiClient & {
  calls: { source: string; player: string; rubric: string; fps: number }[];
} {
  const calls: { source: string; player: string; rubric: string; fps: number }[] = [];
  return {
    calls,
    async assessClip(req) {
      calls.push(req);
      return structuredClone(assessment);
    },
  };
}
