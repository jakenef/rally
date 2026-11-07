import { sampleStats } from "@rally/fixtures";
import type { GeminiAssessment, PlayerStats } from "@rally/types";
import { describe, expect, it } from "vitest";
import {
  accuracy,
  athleticismFrom,
  buildProfile,
  estimateDupr,
  fitCalibration,
  midpointOf,
  templateCard,
  writeCard,
  type Calibration,
  type CalibrationSample,
} from "./index";

const me = sampleStats.players.find((p) => p.selected)!;
const watched = me.watched!;

const player = (over: Partial<PlayerStats> = {}, w: Partial<GeminiAssessment> | null = {}): PlayerStats => ({
  trackId: 1,
  framesSeen: 1000,
  kitchenLineShare: 0.6,
  distanceM: 100,
  avgPartnerSpacingM: 3,
  readyPositionShare: 0.6,
  avgSpeedMps: 1.6,
  peakSpeedMps: 4,
  ...(w === null ? {} : { watched: { ...watched, ...w } }),
  ...over,
});

describe("020 profiles", () => {
  it("PRO-1 a DUPR rating is the skill, with source dupr", () => {
    const p = buildProfile({ playerId: "x", name: "X", stats: me, dupr: 4.12 });
    expect(p.skillSource).toBe("dupr");
    expect(p.skill.mu).toBe(4.12);
  });

  it("PRO-2 from a clip alone, sigma is at least 0.5 and the card shows a range", async () => {
    const p = buildProfile({ playerId: "x", name: "X", stats: me });
    expect(p.skillSource).toBe("video");
    expect(p.skill.sigma).toBeGreaterThanOrEqual(0.5);
    const withCard = await writeCard({ profile: p, watched });
    expect(withCard.card!.headline).toMatch(/Estimated DUPR \d\.\d to \d\.\d/);
  });

  it("PRO-3 every style value is between 0 and 1, even from extreme stats", () => {
    const wild = player({ kitchenLineShare: 1.4, readyPositionShare: -0.2, avgSpeedMps: 9 });
    const s = buildProfile({ playerId: "x", name: "X", stats: wild }).style;
    for (const v of Object.values(s)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("PRO-3 power comes from Gemini's drives against dinks and drops", () => {
    const banger = buildProfile({ playerId: "b", name: "B", stats: player({}, { shots: { ...watched.shots, drive: 20, dink: 2, drop: 0 } }) });
    const dinker = buildProfile({ playerId: "d", name: "D", stats: player({}, { shots: { ...watched.shots, drive: 1, dink: 20, drop: 5 } }) });
    expect(banger.style.power).toBeGreaterThan(0.8);
    expect(dinker.style.power).toBeLessThan(0.1);
  });

  it("PRO-4 without Claude, or when Claude fails, a template card is produced", async () => {
    const p = buildProfile({ playerId: "x", name: "X", stats: me });
    const plain = await writeCard({ profile: p, watched });
    expect(plain.card).toEqual(templateCard(p, watched));
    const failing = await writeCard({ profile: p, watched }, async () => {
      throw new Error("no network");
    });
    expect(failing.card).toEqual(templateCard(p, watched));
  });

  it("PRO-4 a card writer's card is used when it works", async () => {
    const p = buildProfile({ playerId: "x", name: "X", stats: me });
    const card = { headline: "Estimated DUPR 3.5 to 4.0", reasons: ["r"], tip: "t" };
    expect((await writeCard({ profile: p, watched }, async () => card)).card).toEqual(card);
  });

  it("PRO-5 tempo defaults to any and only changes when the player sets it", () => {
    expect(buildProfile({ playerId: "x", name: "X", stats: me }).tempo).toBe("any");
    expect(buildProfile({ playerId: "x", name: "X", stats: me, tempo: "soft" }).tempo).toBe("soft");
  });

  it("PRO-7 confidence is low when the calibration moves the range by more than 0.75", () => {
    const big: Calibration = { weights: [0, 0, 0, 0, 0], bias: 0.9, samples: 8, meanError: 0 };
    const small: Calibration = { weights: [0, 0, 0, 0, 0], bias: 0.1, samples: 8, meanError: 0 };
    expect(estimateDupr(me, 60, big)!.confidence).toBe("low");
    expect(estimateDupr(me, 60, small)!.confidence).toBe("high");
    expect(estimateDupr(me, 60, null)!.confidence).toBe("medium"); // capped without calibration
  });

  it("PRO-8 athleticism is 0 to 100 and a faster player scores higher", () => {
    const slow = athleticismFrom(player({ avgSpeedMps: 1.0, peakSpeedMps: 3 }), 60);
    const fast = athleticismFrom(player({ avgSpeedMps: 2.2, peakSpeedMps: 5.5 }), 60);
    expect(fast).toBeGreaterThan(slow);
    for (const a of [slow, fast, athleticismFrom(player({ avgSpeedMps: 99, peakSpeedMps: 99, distanceM: 1e6 }), 60)]) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(100);
    }
  });

  it("calibration is skipped with fewer than 8 labeled clips", () => {
    const samples: CalibrationSample[] = Array.from({ length: 7 }, () => ({ stats: me, durationSec: 60, labeled: 4 }));
    expect(fitCalibration(samples)).toBeNull();
  });

  it("calibration learns a consistent bias in Gemini's estimates", () => {
    // Gemini rates everyone half a point too high; the labels say so.
    const samples: CalibrationSample[] = [3.0, 3.0, 3.5, 3.5, 4.0, 4.0, 4.5, 4.5, 5.0, 5.0].map((lvl, i) => ({
      durationSec: 60,
      labeled: lvl,
      stats: player({ kitchenLineShare: 0.3 + 0.05 * i, avgSpeedMps: 1.2 + 0.1 * i }, { levelEstimate: { low: lvl + 0.25, high: lvl + 0.75 } }),
    }));
    const before = accuracy(samples, null);
    const cal = fitCalibration(samples)!;
    const after = accuracy(samples, cal);
    expect(before.meanError).toBeCloseTo(0.5, 1);
    expect(after.meanError).toBeLessThan(0.15);
    expect(after.hitRate).toBeGreaterThanOrEqual(0.5);
    expect(cal.meanError).toBe(after.meanError);
  });

  it.todo("PRO-6 on the real calibration clips, the range contains the labeled level for at least half (needs clips from demo/clips.md)");

  it("midpointOf averages the range", () => {
    expect(midpointOf({ low: 3.5, high: 4.0 })).toBe(3.75);
  });
});
