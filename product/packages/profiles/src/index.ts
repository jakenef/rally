// 020 profiles — AI lane (Jake). Clip stats (010) plus an optional DUPR or self-rating in,
// a Profile out: style, estimated DUPR range, athleticism, skill for matching, and a card.
import { isMeasured, type GeminiAssessment, type PlayerStats, type Profile, type Style, type Tempo } from "@rally/types";

export type Card = NonNullable<Profile["card"]>;
export type EstimatedDupr = NonNullable<Profile["estimatedDupr"]>;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const scale = (n: number, lo: number, hi: number) => clamp((n - lo) / (hi - lo), 0, 1);
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/** Shots Gemini saw the player hit after the serve and return: the evidence behind a grade. */
export function rallyShots(w: GeminiAssessment): number {
  const s = w.shots;
  return s.dink + s.drive + s.drop + s.lob + s.volley;
}

/** Fewer rally shots than this and the grade rests on too little: confidence is low. */
export const MIN_EVIDENCE_SHOTS = 8;

// ---------- style ----------

/**
 * 020 behavior 1. Every value 0..1 (PRO-3). Without local tracking, kitchen comes from
 * Gemini's shot mix (dinks and volleys are hit at the line) and mobility and readiness are 0.5.
 */
export function styleFrom(stats: PlayerStats): Style {
  const shots = stats.watched?.shots;
  const hard = shots ? shots.drive : 0;
  const soft = shots ? shots.dink + shots.drop : 0;
  const power = round(hard + soft > 0 ? hard / (hard + soft) : 0.5);
  if (isMeasured(stats)) {
    return {
      kitchen: round(clamp(stats.kitchenLineShare, 0, 1)),
      power,
      mobility: round(scale(stats.avgSpeedMps, 0.8, 2.4)),
      readiness: round(clamp(stats.readyPositionShare, 0, 1)),
    };
  }
  const rally = stats.watched ? rallyShots(stats.watched) : 0;
  const atLine = shots ? shots.dink + shots.volley : 0;
  return { kitchen: round(rally > 0 ? atLine / rally : 0.5), power, mobility: 0.5, readiness: 0.5 };
}

// ---------- athleticism ----------

/** 020 behavior 2: 0..100 from speed, distance per minute and ready position (PRO-8). Needs local tracking. */
export function athleticismFrom(stats: PlayerStats, durationSec: number): number | undefined {
  if (!isMeasured(stats)) return undefined;
  const perMin = durationSec > 0 ? stats.distanceM / (durationSec / 60) : 0;
  const score =
    0.35 * scale(stats.avgSpeedMps, 0.8, 2.4) +
    0.25 * scale(stats.peakSpeedMps, 2.5, 6) +
    0.2 * scale(perMin, 60, 160) +
    0.2 * clamp(stats.readyPositionShare, 0, 1);
  return Math.round(score * 100);
}

// ---------- estimated DUPR and calibration ----------

/** Measured features for the "features" calibration; null without local tracking. */
export function features(stats: PlayerStats, durationSec: number): number[] | null {
  if (!isMeasured(stats)) return null;
  const w = stats.watched;
  const minutes = Math.max(durationSec / 60, 0.5);
  return [
    stats.kitchenLineShare,
    stats.readyPositionShare,
    (athleticismFrom(stats, durationSec) ?? 50) / 100,
    w?.thirdShotDropShare ?? 0.5,
    w ? w.unforcedErrors / minutes : 0,
  ];
}

/**
 * A correction to Gemini's midpoint, fitted on labeled clips.
 * - "shift": add the average gap between label and Gemini (used when clips have no measured stats).
 * - "features": the gap predicted from measured features.
 * meanError is honest: each labeled clip is scored by a calibration fitted without it.
 */
export type Calibration = {
  mode: "shift" | "features";
  bias: number;
  weights: number[];
  samples: number;
  meanError: number;
};

export type CalibrationSample = { stats: PlayerStats; durationSec: number; labeled: number; clipId?: string };

export const MIN_CALIBRATION_SAMPLES = 8;

export const midpointOf = (e: { low: number; high: number }) => (e.low + e.high) / 2;

/** Solve (XᵀX + λI) w = Xᵀy by Gaussian elimination. Small and dependency-free. */
function ridge(x: number[][], y: number[], lambda: number): number[] {
  const n = x[0].length;
  const a = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) =>
      j === n
        ? x.reduce((s, row, k) => s + row[i] * y[k], 0)
        : x.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? lambda : 0),
    ),
  );
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    if (a[c][c] === 0) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((row, i) => (row[i] === 0 ? 0 : row[n] / row[i]));
}

/** The part of the adjustment that comes from this player's measured features (0 in shift mode). */
function featureAdjustment(stats: PlayerStats, durationSec: number, cal: Calibration | null): number {
  if (!cal || cal.mode !== "features") return 0;
  const f = features(stats, durationSec);
  return f ? f.reduce((s, v, i) => s + v * cal.weights[i], 0) : 0;
}

/**
 * 020 behavior 3: Gemini's rubric range, shifted by the calibration, with a confidence.
 * Confidence is low when the measured features pull more than 0.75 away from Gemini (PRO-7),
 * when Gemini saw fewer than MIN_EVIDENCE_SHOTS rally shots, or when Gemini's range is over a
 * point wide; at most medium without a calibration; high only when the calibration's honest
 * error is 0.3 or less.
 */
export function estimateDupr(stats: PlayerStats, durationSec: number, cal: Calibration | null = null): EstimatedDupr | undefined {
  const w = stats.watched;
  if (!w) return undefined;
  const pull = featureAdjustment(stats, durationSec, cal);
  const adj = (cal?.bias ?? 0) + pull;
  const width = w.levelEstimate.high - w.levelEstimate.low;
  let confidence: EstimatedDupr["confidence"];
  if (Math.abs(pull) > 0.75 || width > 1 || rallyShots(w) < MIN_EVIDENCE_SHOTS) confidence = "low";
  else if (!cal) confidence = width <= 0.5 ? "medium" : "low";
  else if (cal.meanError <= 0.3 && width <= 0.5) confidence = "high";
  else confidence = cal.meanError <= 0.6 ? "medium" : "low";
  return {
    low: round(clamp(w.levelEstimate.low + adj, 2, 6)),
    high: round(clamp(w.levelEstimate.high + adj, 2, 6)),
    confidence,
  };
}

function fitRaw(usable: CalibrationSample[]): Omit<Calibration, "meanError"> {
  const gaps = usable.map((s) => s.labeled - midpointOf(s.stats.watched!.levelEstimate));
  const allMeasured = usable.every((s) => isMeasured(s.stats));
  if (!allMeasured) {
    return { mode: "shift", bias: round(gaps.reduce((a, b) => a + b, 0) / gaps.length), weights: [], samples: usable.length };
  }
  const x = usable.map((s) => [...features(s.stats, s.durationSec)!, 1]);
  const w = ridge(x, gaps, 0.5);
  return { mode: "features", weights: w.slice(0, -1), bias: w[w.length - 1], samples: usable.length };
}

/**
 * Fit the correction from labeled clips (020 behavior 3). Null with fewer than
 * MIN_CALIBRATION_SAMPLES labeled clips: the adjustment is then skipped.
 */
export function fitCalibration(samples: CalibrationSample[]): Calibration | null {
  const usable = samples.filter((s) => s.stats.watched);
  if (usable.length < MIN_CALIBRATION_SAMPLES) return null;
  const cal = { ...fitRaw(usable), meanError: 0 };
  // Honest error: score each clip with a calibration fitted on the others.
  const errors = usable.map((s, i) => {
    const others = { ...fitRaw(usable.filter((_, j) => j !== i)), meanError: 0 };
    return Math.abs(midpointOf(estimateDupr(s.stats, s.durationSec, others)!) - s.labeled);
  });
  cal.meanError = round(errors.reduce((a, b) => a + b, 0) / errors.length);
  return cal;
}

/**
 * PRO-6, scored honestly: each labeled clip estimated with a calibration fitted on the other
 * clips (leave one out). Rows say whether the range contains the label, and the midpoint's error.
 */
export function leaveOneOut(samples: CalibrationSample[]) {
  const usable = samples.filter((s) => s.stats.watched);
  const rows = usable.map((s, i) => {
    const cal = fitCalibration(usable.filter((_, j) => j !== i));
    const raw = estimateDupr(s.stats, s.durationSec, null)!;
    const e = estimateDupr(s.stats, s.durationSec, cal)!;
    return {
      clipId: s.clipId,
      labeled: s.labeled,
      gemini: { low: raw.low, high: raw.high },
      estimate: e,
      hit: s.labeled >= e.low && s.labeled <= e.high,
      error: round(Math.abs(midpointOf(e) - s.labeled)),
    };
  });
  const n = rows.length || 1;
  return {
    rows,
    hitRate: round(rows.filter((r) => r.hit).length / n),
    within: (d: number) => rows.filter((r) => r.error <= d).length,
    meanError: round(rows.reduce((s, r) => s + r.error, 0) / n),
    rawMeanError: round(rows.reduce((s, r) => s + Math.abs(midpointOf(r.gemini) - r.labeled), 0) / n),
  };
}

// ---------- the profile ----------

export type ProfileInput = {
  playerId: string;
  name: string;
  stats?: PlayerStats;
  durationSec?: number;
  dupr?: number;
  selfRating?: number;
  tempo?: Tempo;
  calibration?: Calibration | null;
};

const NEUTRAL_STYLE: Style = { kitchen: 0.5, power: 0.5, mobility: 0.5, readiness: 0.5 };

/** 020: everything Rally knows about a player. Pure; writeCard adds the card. */
export function buildProfile(input: ProfileInput): Profile {
  const duration = input.durationSec ?? 60;
  const style = input.stats ? styleFrom(input.stats) : NEUTRAL_STYLE;
  const estimatedDupr = input.stats ? estimateDupr(input.stats, duration, input.calibration ?? null) : undefined;
  const athleticism = input.stats ? athleticismFrom(input.stats, duration) : undefined;

  // 020 behavior 4: skill for matching
  let skill: Profile["skill"];
  let skillSource: Profile["skillSource"];
  if (input.dupr !== undefined) {
    skill = { mu: input.dupr, sigma: 0.25 };
    skillSource = "dupr";
  } else if (estimatedDupr) {
    const m = midpointOf(estimatedDupr);
    skill = { mu: round(input.selfRating !== undefined ? (m + input.selfRating) / 2 : m), sigma: 0.5 };
    skillSource = "video";
  } else if (input.selfRating !== undefined) {
    skill = { mu: input.selfRating, sigma: 0.8 };
    skillSource = "self";
  } else {
    skill = { mu: 3.0, sigma: 1.0 };
    skillSource = "self";
  }

  return {
    playerId: input.playerId,
    name: input.name,
    style,
    skill,
    skillSource,
    tempo: input.tempo ?? "any", // PRO-5: only the player sets it
    ...(estimatedDupr ? { estimatedDupr } : {}),
    ...(athleticism !== undefined ? { athleticism } : {}),
  };
}

// ---------- the card ----------

const fmt = (n: number) => n.toFixed(1);

/** The range as the card shows it: always a range, never one number (PRO-2). */
export function rangeLabel(e: { low: number; high: number }): string {
  return `${fmt(e.low)} to ${fmt(e.high)}`;
}

export function styleLabel(s: Style): string {
  if (s.power >= 0.6) return "hits hard";
  if (s.power <= 0.35 && s.kitchen >= 0.6) return "soft game, lives at the kitchen line";
  if (s.power <= 0.35) return "soft game";
  return "mixes soft and hard";
}

/** PRO-4: the card without Claude. */
export function templateCard(profile: Profile, watched?: GeminiAssessment): Card {
  const parts = [
    profile.estimatedDupr ? `Estimated DUPR ${rangeLabel(profile.estimatedDupr)}` : `Skill ${fmt(profile.skill.mu)}`,
    profile.athleticism !== undefined ? `Athleticism ${profile.athleticism}` : null,
    styleLabel(profile.style),
  ].filter(Boolean);
  const tip =
    profile.style.kitchen < 0.5
      ? "Get to the kitchen line after the return."
      : profile.style.power >= 0.6
        ? "Reset hard balls into the kitchen instead of driving them back."
        : "Speed up only balls that bounce above the net.";
  return { headline: parts.join(" · "), reasons: watched?.reasons.slice(0, 3) ?? [], tip };
}

/** What a card writer gets: the profile and what Gemini saw. */
export type CardRequest = { profile: Profile; watched?: GeminiAssessment };
export type CardWriter = (req: CardRequest) => Promise<Card>;

/**
 * 020 behavior 6: Claude writes the card when a writer is given; the template otherwise,
 * or if the writer fails, so the demo never shows an error (PRO-4).
 */
export async function writeCard(req: CardRequest, writer?: CardWriter): Promise<Profile> {
  let card: Card;
  try {
    card = writer ? await writer(req) : templateCard(req.profile, req.watched);
  } catch {
    card = templateCard(req.profile, req.watched);
  }
  return { ...req.profile, card };
}
