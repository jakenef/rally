import { afterEach, expect, it, vi } from "vitest";
import { createSessions } from "./index";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("SESS-3 sends structured output requests through the server adapter without calling a live service", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubEnv("ANTHROPIC_MODEL", "test-model");
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ priceCents: 1200, minSkill: 3.5 }) }],
  })));
  vi.stubGlobal("fetch", fetch);
  expect(await createSessions().parseRule("3.5+, $12")).toEqual({ minSkill: 3.5, priceCents: 1200 });
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe("https://api.anthropic.com/v1/messages");
  const body = JSON.parse(request.body);
  expect(body.model).toBe("test-model");
  expect(body.output_config.format.type).toBe("json_schema");
  expect(body.output_config.format.schema.additionalProperties).toBe(false);
});

it("SESS-3 reports missing credentials without making a request", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(createSessions().parseRule("3.5+")).rejects.toThrow("Set ANTHROPIC_API_KEY");
  expect(fetch).not.toHaveBeenCalled();
});

it("SESS-3 reports provider failure without saving a draft", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
  await expect(createSessions().parseRule("3.5+")).rejects.toThrow("HTTP 503");
});

it.each(["max_tokens", "refusal"])("SESS-3 rejects unfinished or refused output (%s)", async (stop_reason) => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    stop_reason, content: [{ type: "text", text: '{"priceCents":1200}' }],
  }))));
  await expect(createSessions().parseRule("$12")).rejects.toThrow("did not finish");
});
