import { sampleStats } from "@rally/fixtures";
import type { GeminiAssessment, PlayerStats } from "@rally/types";
import { describe, expect, it } from "vitest";
import {
  athleticismFrom,
  buildProfile,
  estimateDupr,
  fitCalibration,
  leaveOneOut,
  midpointOf,
  styleFrom,
  templateCard,
  writeCard,
  type Calibration,
  type CalibrationSample,
} from "./index";

const me = sampleStats.players.find((p) => p.selected)!;
const watched = me.watched!;

const measured = (over: Partial<PlayerStats> = {}, w: Partial<GeminiAssessment> = {}): PlayerStats =>
  ({
    trackId: 1,
    framesSeen: 1000,
    kitchenLineShare: 0.6,
    distanceM: 100,
    avgPartnerSpacingM: 3,
    readyPositionShare: 0.6,
    avgSpeedMps: 1.6,
    peakSpeedMps: 4,
    watched: { ...watched, ...w },
    ...over,
  }) as PlayerStats;

const watchedOnly = (w: Partial<GeminiAssessment> = {}): PlayerStats => ({ trackId: 0, selected: true, measured: false, watched: { ...watched, ...w } });

const cal = (over: Partial<Calibration>): Calibration => ({ mode: "shift", bias: 0, weights: [], samples: 9, meanError: 0.2, ...over });

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
    const wild = measured({ kitchenLineShare: 1.4, readyPositionShare: -0.2, avgSpeedMps: 9 } as Partial<PlayerStats>);
    for (const s of [buildProfile({ playerId: "x", name: "X", stats: wild }).style, styleFrom(watchedOnly())]) {
      for (const v of Object.values(s)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("PRO-3 power comes from Gemini's drives against dinks and drops", () => {
    const banger = styleFrom(measured({}, { shots: { ...watched.shots, drive: 20, dink: 2, drop: 0 } }));
    const dinker = styleFrom(measured({}, { shots: { ...watched.shots, drive: 1, dink: 20, drop: 5 } }));
    expect(banger.power).toBeGreaterThan(0.8);
    expect(dinker.power).toBeLessThan(0.1);
  });

  it("PRO-3 without tracking, kitchen comes from Gemini's shot mix and movement is neutral", () => {
    const s = styleFrom(watchedOnly({ shots: { dink: 6, volley: 2, drive: 2, drop: 0, lob: 0, serve: 3, return: 3 } }));
    expect(s.kitchen).toBe(0.8);
    expect(s.mobility).toBe(0.5);
    expect(athleticismFrom(watchedOnly(), 60)).toBeUndefined();
    expect(buildProfile({ playerId: "x", name: "X", stats: watchedOnly() }).athleticism).toBeUndefined();
  });

  it("PRO-4 without Claude, or when Claude fails, a template card is produced", async () => {
    const p = buildProfile({ playerId: "x", name: "X", stats: me });
    expect((await writeCard({ profile: p, watched })).card).toEqual(templateCard(p, watched));
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

  it("PRO-7 confidence is low when measured features pull more than 0.75 away from Gemini", () => {
    const pulls = cal({ mode: "features", weights: [2, 0, 0, 0, 0] }); // kitchen 0.6 * 2 = 1.2
    const agrees = cal({ mode: "features", weights: [0.1, 0, 0, 0, 0] });
    expect(estimateDupr(measured(), 60, pulls)!.confidence).toBe("low");
    expect(estimateDupr(measured(), 60, agrees)!.confidence).toBe("high");
  });

  it("PRO-7 a large constant shift alone doesn't lower confidence", () => {
    expect(estimateDupr(measured(), 60, cal({ bias: 0.9 }))!.confidence).toBe("high");
  });

  it("confidence is low when Gemini saw fewer than 8 rally shots, and at most medium without calibration", () => {
    const thin = measured({}, { shots: { dink: 1, drive: 0, drop: 0, lob: 0, volley: 0, serve: 1, return: 2 } });
    expect(estimateDupr(thin, 60, cal({}))!.confidence).toBe("low");
    expect(estimateDupr(measured(), 60, null)!.confidence).toBe("medium");
  });

  it("PRO-8 athleticism is 0 to 100 and a faster player scores higher", () => {
    const slow = athleticismFrom(measured({ avgSpeedMps: 1.0, peakSpeedMps: 3 } as Partial<PlayerStats>), 60)!;
    const fast = athleticismFrom(measured({ avgSpeedMps: 2.2, peakSpeedMps: 5.5 } as Partial<PlayerStats>), 60)!;
    expect(fast).toBeGreaterThan(slow);
    for (const a of [slow, fast, athleticismFrom(measured({ avgSpeedMps: 99, peakSpeedMps: 99, distanceM: 1e6 } as Partial<PlayerStats>), 60)!]) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(100);
    }
  });

  it("calibration is skipped with fewer than 8 labeled clips", () => {
    const samples: CalibrationSample[] = Array.from({ length: 7 }, () => ({ stats: me, durationSec: 60, labeled: 4 }));
    expect(fitCalibration(samples)).toBeNull();
  });

  // Gemini rates everyone 0.8 low; the labels say so.
  const biased = (stats: (lvl: number, i: number) => PlayerStats): CalibrationSample[] =>
    [3.0, 3.5, 3.5, 4.0, 4.0, 4.5, 4.5, 5.0, 5.0].map((lvl, i) => ({ durationSec: 60, labeled: lvl, stats: stats(lvl, i) }));

  it("shift calibration learns Gemini's average gap when clips have no measured stats", () => {
    const samples = biased((lvl) => watchedOnly({ levelEstimate: { low: lvl - 1.05, high: lvl - 0.55 } }));
    const c = fitCalibration(samples)!;
    expect(c.mode).toBe("shift");
    expect(c.bias).toBeCloseTo(0.8, 2);
    expect(c.meanError).toBeLessThan(0.05);
  });

  it("features calibration is used when every clip has measured stats", () => {
    const samples = biased((lvl, i) =>
      measured({ kitchenLineShare: 0.3 + 0.05 * i, avgSpeedMps: 1.2 + 0.1 * i } as Partial<PlayerStats>, { levelEstimate: { low: lvl - 1.05, high: lvl - 0.55 } }),
    );
    expect(fitCalibration(samples)!.mode).toBe("features");
  });

  it("PRO-6 leave-one-out scores each clip with a calibration fitted without it", () => {
    const samples = biased((lvl) => watchedOnly({ levelEstimate: { low: lvl - 1.05, high: lvl - 0.55 } }));
    const loo = leaveOneOut(samples);
    expect(loo.rows).toHaveLength(9);
    expect(loo.rawMeanError).toBeCloseTo(0.8, 2);
    expect(loo.meanError).toBeLessThan(0.05);
    expect(loo.hitRate).toBeGreaterThanOrEqual(0.5);
  });

  it("midpointOf averages the range", () => {
    expect(midpointOf({ low: 3.5, high: 4.0 })).toBe(3.75);
  });
});
