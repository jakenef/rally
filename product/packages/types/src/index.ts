// Shared types: the contract between the AI lane and the Facility lane.
// Every type here comes from a spec in ../../../specs. Change this file only
// after telling the other person (specs/README.md, Lanes).

// ---------- 010 vision (AI lane) ----------

export type ShotType = "dink" | "drive" | "drop" | "lob" | "volley" | "serve" | "return";

/** What Gemini saw when it watched the selected player (010). */
export type GeminiAssessment = {
  shots: Record<ShotType, number>;
  thirdShotDropShare: number | null;
  unforcedErrors: number;
  resetsUnderPressure: number;
  /** 2.0..6.0, from the rubric. */
  levelEstimate: { low: number; high: number };
  /** What it saw, quoted on the player card. */
  reasons: string[];
  /** Each shot the player hit, with its time on the video's own timeline (010 VIS-7). */
  events?: ShotEvent[];
};

export type ShotKind = ShotType | "reset" | "speedup" | "putaway" | "error";

/** One shot Gemini saw the graded player hit (010). */
export type ShotEvent = {
  /** Seconds on the video's own timeline. */
  t: number;
  shot: ShotKind;
  /** A short callout, 1 to 3 words: "Third-shot drop". */
  label: string;
};

/** The numbers measured locally from tracking (010). */
export type MeasuredStats = {
  framesSeen: number;
  kitchenLineShare: number;
  distanceM: number;
  avgPartnerSpacingM: number | null;
  readyPositionShare: number;
  avgSpeedMps: number;
  peakSpeedMps: number;
};

/**
 * Per-player numbers from one clip (010). The measured fields are present only when local
 * tracking ran (`measured` is not false); `watched` comes from Gemini, for the selected player.
 */
export type PlayerStats = {
  trackId: number;
  selected?: boolean;
  /** false when only Gemini watched the clip (court mapping wasn't possible). */
  measured?: boolean;
  watched?: GeminiAssessment;
} & (MeasuredStats | ({ measured: false } & Partial<MeasuredStats>));

export type ClipStats = {
  clipId: string;
  /** The YouTube link, from demo/clips.md. */
  source: string;
  durationSec: number;
  players: PlayerStats[];
  /** Credited on screen. */
  channel?: string;
  /** The uploader's stated level, for calibration (020). Not a verified rating. */
  labeledLevel?: number;
  /** Where play starts in the YouTube video, seconds. */
  startSec?: number;
  /** Used in scene 4 (same rating, different game). */
  scene4?: boolean;
};

/** True when local tracking measured this player. */
export const isMeasured = (p: PlayerStats): p is PlayerStats & MeasuredStats => p.measured !== false;

// ---------- 020 profiles (AI lane; read by the Facility lane) ----------

/** Play style, every value 0..1. */
export type Style = {
  /** Lives at the kitchen line. */
  kitchen: number;
  /** Drives rather than dinks. */
  power: number;
  mobility: number;
  readiness: number;
};

/** The kind of game a player wants. They choose it; it's never inferred. */
export type Tempo = "soft" | "fast" | "any";

export type SkillSource = "dupr" | "video" | "self" | "games";

export type Profile = {
  playerId: string;
  name: string;
  style: Style;
  /** 2.0..6.0 scale; sigma is the uncertainty. */
  skill: { mu: number; sigma: number };
  skillSource: SkillSource;
  tempo: Tempo;
  estimatedDupr?: { low: number; high: number; confidence: "low" | "medium" | "high" };
  /** 0..100. */
  athleticism?: number;
  card?: { headline: string; reasons: string[]; tip: string };
};

// ---------- 030 matching (Facility lane) ----------

export type Team = [string, string];

export type Court = {
  court: number;
  teams: [Team, Team];
  /** 0..100. */
  fairness: number;
  /** Short reasons, for the dashboard. */
  why: string[];
};

export type Assignment = { courts: Court[]; benched: string[] };

// ---------- 040 sessions (Facility lane; signUp is called by the AI lane) ----------

export type Session = {
  id: string;
  facilityId: string;
  startsAt: string;
  courts: number;
  priceCents: number;
  minSkill?: number;
  maxSkill?: number;
  signups: string[];
  waitlist: string[];
  /** Simulated payment: playerIds whose Pay button was pressed. */
  paid: string[];
};

export type SignUpResult = { status: "joined" | "waitlisted" | "rejected"; reason?: string };

/** Where the lanes meet: the player screen calls this with a new Profile. */
export type SignUp = (sessionId: string, profile: Profile) => SignUpResult;

// ---------- 050 backfill (Facility lane) ----------

export type RankedCandidate = { playerId: string; fairnessAfter: number };
export type Offer = { offerId: string; sessionId: string; playerId: string; message: string };
export type OfferReply = "accepted" | "declined";

// ---------- outside services (both lanes; faked in tests) ----------

/** Claude, for player cards and plain-English rules. */
export interface ClaudeClient {
  /** Returns JSON matching the named shape. */
  json<T>(request: { prompt: string; shape: string }): Promise<T>;
}

/** Gemini, for watching a clip. */
export interface GeminiClient {
  assessClip(request: { source: string; player: string; rubric: string; fps: number }): Promise<GeminiAssessment>;
}
