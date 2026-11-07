import type { ClaudeClient } from "@rally/types";

const schema = {
  type: "object",
  properties: {
    startsAt: { type: ["string", "null"], description: "ISO 8601 date and time with timezone offset, or null if not mentioned" },
    courts: { type: ["integer", "null"], description: "Positive court count, or null if not mentioned" },
    priceCents: { type: ["integer", "null"], description: "Nonnegative price in cents, or null if not mentioned" },
    minSkill: { type: ["number", "null"], description: "Minimum skill from 2.0 to 6.0, or null if not mentioned" },
    maxSkill: { type: ["number", "null"], description: "Maximum skill from 2.0 to 6.0, or null if not mentioned" },
  },
  required: ["startsAt", "courts", "priceCents", "minSkill", "maxSkill"],
  additionalProperties: false,
};

/** Server-side adapter; read credentials only when parsing. */
export const ruleClaude: ClaudeClient = {
  async json<T>({ prompt, shape }: { prompt: string; shape: string }): Promise<T> {
    if (typeof window !== "undefined") throw new Error("Parse session rules on the server");
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Set ANTHROPIC_API_KEY to parse rules, or inject a fake Claude client for the demo");
    if (shape !== "SessionRule") throw new Error(`Unsupported Claude shape: ${shape}`);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: { type: "json_schema", schema } },
      }),
    });
    if (!response.ok) throw new Error(`Claude rule parsing failed (HTTP ${response.status})`);
    const result = await response.json() as { stop_reason: string; content: { type: string; text?: string }[] };
    if (result.stop_reason !== "end_turn") throw new Error("Claude did not finish parsing the session rule");
    const text = result.content.find(block => block.type === "text")?.text;
    if (!text) throw new Error("Claude returned no session rule");
    return JSON.parse(text) as T;
  },
};
