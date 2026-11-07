// 020 profiles — AI lane (Jake). Clip stats (010) plus an optional DUPR or self-rating in,
// a Profile out: style, estimated DUPR range, athleticism, skill for matching, and a card.
import type { GeminiAssessment, PlayerStats, Profile, Style, Tempo } from "@rally/types";

export type Card = NonNullable<Profile["card"]>;
export type EstimatedDupr = NonNullable<Profile["estimatedDupr"]>;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const scale = (n: number, lo: number, hi: number) => clamp((n - lo) / (hi - lo), 0, 1);
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

// ---------- style ----------

/** 020 behavior 1. Every value 0..1 (PRO-3). */
export function styleFrom(stats: PlayerStats): Style {
  const shots = stats.watched?.shots;
  const hard = shots ? shots.drive : 0;
  const soft = shots ? shots.dink + shots.drop : 0;
  return {
    kitchen: round(clamp(stats.kitchenLineShare, 0, 1)),
    power: round(hard + soft > 0 ? hard / (hard + soft) : 0.5),
    mobility: round(scale(stats.avgSpeedMps, 0.8, 2.4)),
    readiness: round(clamp(stats.readyPositionShare, 0, 1)),
  };
}

// ---------- athleticism ----------

/** 020 behavior 2: 0..100 from speed, distance per minute and ready position (PRO-8). */
export function athleticismFrom(stats: PlayerStats, durationSec: number): number {
  const perMin = durationSec > 0 ? stats.distanceM / (durationSec / 60) : 0;
  const score =
    0.35 * scale(stats.avgSpeedMps, 0.8, 2.4) +
    0.25 * scale(stats.peakSpeedMps, 2.5, 6) +
    0.2 * scale(perMin, 60, 160) +
    0.2 * clamp(stats.readyPositionShare, 0, 1);
  return Math.round(score * 100);
}

// ---------- estimated DUPR and calibration ----------

/** Measured features the calibration fits on. */
export function features(stats: PlayerStats, durationSec: number): number[] {
  const w = stats.watched;
  const minutes = Math.max(durationSec / 60, 0.5);
  return [
    stats.kitchenLineShare,
    stats.readyPositionShare,
    athleticismFrom(stats, durationSec) / 100,
    w?.thirdShotDropShare ?? 0.5,
    w ? w.unforcedErrors / minutes : 0,
  ];
}

/** A linear correction to Gemini's midpoint, fitted on labeled clips. */
export type Calibration = { weights: number[]; bias: number; samples: number; meanError: number };

export type CalibrationSample = { stats: PlayerStats; durationSec: number; labeled: number };

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

function adjustment(stats: PlayerStats, durationSec: number, cal: Calibration | null): number {
  if (!cal) return 0;
  return features(stats, durationSec).reduce((s, v, i) => s + v * cal.weights[i], cal.bias);
}

/**
 * 020 behavior 3: Gemini's rubric range, shifted by the calibration, with a confidence.
 * Low when the two signals disagree by more than 0.75 (PRO-7); at most medium without a calibration.
 */
export function estimateDupr(stats: PlayerStats, durationSec: number, cal: Calibration | null = null): EstimatedDupr | undefined {
  const w = stats.watched;
  if (!w) return undefined;
  const adj = adjustment(stats, durationSec, cal);
  const width = w.levelEstimate.high - w.levelEstimate.low;
  let confidence: EstimatedDupr["confidence"];
  if (Math.abs(adj) > 0.75 || width > 1) confidence = "low";
  else if (cal && Math.abs(adj) <= 0.25 && width <= 0.5) confidence = "high";
  else confidence = width <= 0.5 ? "medium" : "low";
  return {
    low: round(clamp(w.levelEstimate.low + adj, 2, 6)),
    high: round(clamp(w.levelEstimate.high + adj, 2, 6)),
    confidence,
  };
}

/**
 * Fit how far Gemini's midpoint is off, from measured features (020 behavior 3).
 * Returns null with fewer than MIN_CALIBRATION_SAMPLES clips: the adjustment is then skipped.
 */
export function fitCalibration(samples: CalibrationSample[]): Calibration | null {
  const usable = samples.filter((s) => s.stats.watched);
  if (usable.length < MIN_CALIBRATION_SAMPLES) return null;
  const x = usable.map((s) => [...features(s.stats, s.durationSec), 1]);
  const y = usable.map((s) => s.labeled - midpointOf(s.stats.watched!.levelEstimate));
  const w = ridge(x, y, 0.5);
  const cal: Calibration = { weights: w.slice(0, -1), bias: w[w.length - 1], samples: usable.length, meanError: 0 };
  cal.meanError = round(
    usable.reduce((s, smp) => s + Math.abs(midpointOf(estimateDupr(smp.stats, smp.durationSec, cal)!) - smp.labeled), 0) / usable.length,
  );
  return cal;
}

/** PRO-6: how often the range contains the labeled level, and the midpoint's mean error. */
export function accuracy(samples: CalibrationSample[], cal: Calibration | null) {
  const rows = samples
    .filter((s) => s.stats.watched)
    .map((s) => {
      const e = estimateDupr(s.stats, s.durationSec, cal)!;
      return { labeled: s.labeled, low: e.low, high: e.high, hit: s.labeled >= e.low && s.labeled <= e.high, error: Math.abs(midpointOf(e) - s.labeled) };
    });
  const n = rows.length || 1;
  return { rows, hitRate: round(rows.filter((r) => r.hit).length / n), meanError: round(rows.reduce((s, r) => s + r.error, 0) / n) };
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
