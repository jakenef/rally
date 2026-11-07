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
};

/** Per-player numbers from one clip (010). Measured locally; `watched` comes from Gemini. */
export type PlayerStats = {
  trackId: number;
  selected?: boolean;
  framesSeen: number;
  kitchenLineShare: number;
  distanceM: number;
  avgPartnerSpacingM: number | null;
  readyPositionShare: number;
  avgSpeedMps: number;
  peakSpeedMps: number;
  watched?: GeminiAssessment;
};

export type ClipStats = {
  clipId: string;
  /** The YouTube link, from demo/clips.md. */
  source: string;
  durationSec: number;
  players: PlayerStats[];
};

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
