// 050 backfill — Facility lane. Built in BUILD.md step 1.3. Until then every function throws, and the
// other lane uses product/fixtures instead.
import type { Offer, OfferReply, Profile, RankedCandidate, Session } from "@rally/types";

const notBuilt = (): never => {
  throw new Error("backfill is not built yet (BUILD.md step 1.3)");
};

export function rankWaitlist(session: Session, leaving: string, profiles: Map<string, Profile>): RankedCandidate[] {
  return notBuilt();
}
export function offer(sessionId: string, playerId: string): Offer {
  return notBuilt();
}
export function reply(offerId: string, answer: "yes" | "no"): OfferReply {
  return notBuilt();
}
