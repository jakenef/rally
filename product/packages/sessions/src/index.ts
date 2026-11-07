// 040 sessions — Facility lane, BUILD.md step 1.2.
import type { ClaudeClient, Profile, Session, SignUpResult } from "@rally/types";
import { ruleClaude } from "./rule-claude";

export type SessionRule = Pick<Session, "startsAt" | "courts" | "priceCents" | "minSkill" | "maxSkill">;
export type RuleDraft = Partial<SessionRule>;

/** Only owner-editable fields may come back from Claude or an approval form. */
function validateRule(value: unknown): RuleDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid session rule");
  const input = value as Record<string, unknown>;
  const result: RuleDraft = {};
  if (input.startsAt != null) {
    if (typeof input.startsAt !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(input.startsAt) || !Number.isFinite(Date.parse(input.startsAt))) {
      throw new Error("Rule startsAt must be an ISO date with a timezone offset");
    }
    result.startsAt = input.startsAt;
  }
  for (const key of ["courts", "priceCents", "minSkill", "maxSkill"] as const) {
    const n = input[key];
    if (n == null) continue;
    if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`Invalid rule ${key}`);
    if (key === "courts" && (!Number.isInteger(n) || n < 1)) throw new Error("Rule courts must be a positive integer");
    if (key === "priceCents" && (!Number.isInteger(n) || n < 0)) throw new Error("Rule priceCents must be a nonnegative integer");
    if ((key === "minSkill" || key === "maxSkill") && (n < 2 || n > 6)) throw new Error(`Rule ${key} must be between 2 and 6`);
    result[key] = n;
  }
  if (result.minSkill !== undefined && result.maxSkill !== undefined && result.minSkill > result.maxSkill) {
    throw new Error("Rule minSkill cannot exceed maxSkill");
  }
  return result;
}

/** An isolated in-memory demo store. Pass fakeClaude and a fixed clock in tests. */
export function createSessions(options: {
  sessions?: Session[];
  claude?: ClaudeClient;
  now?: () => Date;
  timeZone?: string;
} = {}) {
  const sessions = new Map<string, Session>();
  const now = options.now ?? (() => new Date());
  const timeZone = options.timeZone ?? "America/Denver";

  function requireSession(id: string): Session {
    const session = sessions.get(id);
    if (!session) throw new Error(`Unknown session: ${id}`);
    return session;
  }

  /** Seed/create a session explicitly; reading a fixture never mutates it. */
  function registerSession(session: Session): Session {
    if (sessions.has(session.id)) throw new Error(`Session already exists: ${session.id}`);
    validateRule(session);
    if (session.signups.length > session.courts * 4) throw new Error("Session sign-ups exceed capacity");
    sessions.set(session.id, structuredClone(session));
    return getSession(session.id);
  }

  function getSession(id: string): Session {
    return structuredClone(requireSession(id));
  }

  /** The shared AI → Facility contract: take a Profile, enforce its skill.mu. */
  function signUp(sessionId: string, profile: Profile): SignUpResult {
    const session = requireSession(sessionId);
    const id = profile.playerId;
    if (session.signups.includes(id)) return { status: "joined" };
    if (session.waitlist.includes(id)) return { status: "waitlisted" };
    if (session.minSkill !== undefined && profile.skill.mu < session.minSkill) {
      return { status: "rejected", reason: `This session requires minSkill ${session.minSkill}+; your rating is ${profile.skill.mu}.` };
    }
    if (session.maxSkill !== undefined && profile.skill.mu > session.maxSkill) {
      return { status: "rejected", reason: `This session requires maxSkill ${session.maxSkill} or below; your rating is ${profile.skill.mu}.` };
    }
    if (session.signups.length >= session.courts * 4) {
      session.waitlist.push(id);
      return { status: "waitlisted" };
    }
    session.signups.push(id);
    return { status: "joined" };
  }

  /** Hook for the simulated Pay button. No payment provider is called. */
  function markPaid(sessionId: string, playerId: string): Session {
    const session = requireSession(sessionId);
    if (!session.signups.includes(playerId)) throw new Error("Only a signed-up player can pay");
    if (!session.paid.includes(playerId)) session.paid.push(playerId);
    return getSession(sessionId);
  }

  /** Returns a preview only. The owner must call approveRule to save it. */
  async function parseRule(text: string): Promise<RuleDraft> {
    if (!text.trim()) throw new Error("Enter a session rule");
    const draft = await (options.claude ?? ruleClaude).json<unknown>({
      shape: "SessionRule",
      prompt: [
        "Extract session rules from the owner's text. Return only the SessionRule fields.",
        "Use null for fields not mentioned. Prices are integer cents; skill is on the 2.0–6.0 scale.",
        `Reference time: ${now().toISOString()}. Facility timezone: ${timeZone}.`,
        "Resolve weekdays to their next future occurrence in the facility timezone. Return startsAt as ISO 8601 with its correct timezone offset.",
        "For example, 3.5+ means minSkill 3.5 and $12 means priceCents 1200. Do not invent courts or other missing rules.",
        `Owner's text: ${JSON.stringify(text)}`,
      ].join("\n"),
    });
    return validateRule(draft);
  }

  function approveRule(sessionId: string, draft: RuleDraft): Session {
    const session = requireSession(sessionId);
    const rule = validateRule(draft);
    const updated = { ...session, ...rule };
    validateRule(updated);
    if (updated.signups.length > updated.courts * 4) throw new Error("Cannot reduce courts below current sign-ups");
    sessions.set(sessionId, updated);
    return getSession(sessionId);
  }

  for (const session of options.sessions ?? []) registerSession(session);
  return { registerSession, getSession, signUp, markPaid, parseRule, approveRule };
}

// Default store for the app; use createSessions for independent demos and tests.
export const { registerSession, getSession, signUp, markPaid, parseRule, approveRule } = createSessions();
