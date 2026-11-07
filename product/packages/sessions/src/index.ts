// 040 sessions — Facility lane, demo scope (SESS-1, SESS-2).
import type { Profile, Session, SignUpResult } from "@rally/types";

/** An isolated in-memory store, seeded with fixed demo sessions. */
export function createSessions(options: { sessions?: Session[] } = {}) {
  const sessions = new Map<string, Session>();

  function requireSession(id: string): Session {
    const session = sessions.get(id);
    if (!session) throw new Error(`Unknown session: ${id}`);
    return session;
  }

  /** Seed/create a session explicitly; reading a fixture never mutates it. */
  function registerSession(session: Session): Session {
    if (sessions.has(session.id)) throw new Error(`Session already exists: ${session.id}`);
    if (!Number.isInteger(session.courts) || session.courts < 1) throw new Error("Session needs a positive court count");
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

  for (const session of options.sessions ?? []) registerSession(session);
  return { registerSession, getSession, signUp };
}

// Default app store; seed once with registerSession before signing up players.
export const { registerSession, getSession, signUp } = createSessions();
