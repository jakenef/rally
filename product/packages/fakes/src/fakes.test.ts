import { describe, expect, it } from "vitest";
import { fakeClaude, fakeGemini, sampleAssessment } from "./index";

describe("fakes", () => {
  it("fakeClaude returns queued replies in order and records calls", async () => {
    const claude = fakeClaude([{ a: 1 }, { a: 2 }]);
    expect(await claude.json({ prompt: "p", shape: "X" })).toEqual({ a: 1 });
    expect(await claude.json({ prompt: "q", shape: "X" })).toEqual({ a: 2 });
    expect(claude.calls.map((c) => c.prompt)).toEqual(["p", "q"]);
    await expect(claude.json({ prompt: "r", shape: "X" })).rejects.toThrow(/no reply queued/);
  });

  it("fakeGemini returns a copy of the assessment", async () => {
    const gemini = fakeGemini();
    const a = await gemini.assessClip({ source: "yt", player: "near left", rubric: "r", fps: 5 });
    expect(a).toEqual(sampleAssessment);
    a.reasons.push("changed");
    expect(sampleAssessment.reasons).toHaveLength(3);
    expect(gemini.calls[0].fps).toBe(5);
  });
});
