// 040 sessions — Facility lane. Built in BUILD.md step 1.2. Until then every function throws, and the
// other lane uses product/fixtures instead.
import type { Profile, Session, SignUpResult } from "@rally/types";

const notBuilt = (): never => {
  throw new Error("sessions is not built yet (BUILD.md step 1.2)");
};

/** Where the lanes meet: the player screen (AI lane) calls this with a new Profile. */
export function signUp(sessionId: string, profile: Profile): SignUpResult {
  return notBuilt();
}
export function parseRule(text: string): Promise<Partial<Session>> {
  return notBuilt();
}
