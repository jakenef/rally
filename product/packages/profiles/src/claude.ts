// Claude writes the player card (020 behavior 6). Server-side only: it reads ANTHROPIC_API_KEY.
// Tests never import this file; they pass a fake CardWriter to writeCard.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { rangeLabel, styleLabel, type Card, type CardRequest, type CardWriter } from "./index";

const MODEL = "claude-opus-5-5";

const CardSchema = z.object({
  headline: z.string(),
  reasons: z.array(z.string()),
  tip: z.string(),
});

const SYSTEM = `You write player cards for Rally, an app that builds balanced pickleball sessions.
Voice: short declaratives, the sport's own words (kitchen, dink, third-shot drop, reset), no emoji, no exclamation marks.
The headline starts with the estimated DUPR range exactly as given, then athleticism, then one phrase on play style, joined with " · ".
Reasons: two or three short sentences, each based only on what the coach observed. Never invent observations.
Tip: one sentence, the single most useful thing this player could work on.
The estimate is a range, never a single number, and it is labeled "Estimated DUPR".`;

function prompt({ profile, watched }: CardRequest): string {
  const p = profile;
  return [
    p.estimatedDupr ? `Estimated DUPR: ${rangeLabel(p.estimatedDupr)} (${p.estimatedDupr.confidence} confidence)` : `Skill: ${p.skill.mu.toFixed(1)}`,
    p.athleticism !== undefined ? `Athleticism: ${p.athleticism} out of 100` : null,
    `Play style: ${styleLabel(p.style)} (kitchen ${p.style.kitchen}, power ${p.style.power}, mobility ${p.style.mobility}, readiness ${p.style.readiness}, all 0 to 1)`,
    watched ? `What the coach observed:\n${watched.reasons.map((r) => `- ${r}`).join("\n")}` : null,
    watched ? `Shots: ${Object.entries(watched.shots).map(([k, v]) => `${k} ${v}`).join(", ")}; unforced errors ${watched.unforcedErrors}; resets under pressure ${watched.resetsUnderPressure}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** A CardWriter backed by Claude, or undefined when there's no ANTHROPIC_API_KEY (the template is used then). */
export function claudeCardWriter(apiKey = process.env.ANTHROPIC_API_KEY): CardWriter | undefined {
  if (!apiKey) return undefined;
  const client = new Anthropic({ apiKey });
  return async (req) => {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      // On a safety decline the API retries on a fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt(req) }],
      output_config: { effort: "low", format: zodOutputFormat(CardSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error(`Claude returned no card (stop_reason ${response.stop_reason})`);
    }
    const card: Card = response.parsed_output;
    return card;
  };
}
